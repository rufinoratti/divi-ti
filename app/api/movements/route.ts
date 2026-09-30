import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createMovementSchema, groupIdQuerySchema } from '@/lib/api/schemas';
import { roundCurrency, splitAmountEquallyByMemberId } from '@/lib/ledger';
import {
  authErrorResponse,
  configurationErrorResponse,
  errorResponse,
  internalErrorResponse,
  readJson,
  validationResponse,
} from '@/lib/auth/http';
import { createSupabaseRouteClient } from '@/lib/supabase/server';

type MovementParticipant = {
  miembro_id: string;
  monto_parte: number;
};

type DatabaseMovement = {
  id: string;
  grupo_id: string;
  tipo: 'gasto' | 'prestamo';
  descripcion: string;
  monto: number;
  moneda: string;
  categoria: string;
  division_method: 'equal' | 'consumption' | 'income' | null;
  pagado_por: string;
  receptor: string | null;
  creado_en: string;
  movimiento_participantes?: MovementParticipant[];
};

function mapMovement(movement: DatabaseMovement) {
  const participants = movement.movimiento_participantes ?? [];
  return {
    id: movement.id,
    kind: movement.tipo === 'prestamo' ? 'loan' : 'expense',
    description: movement.descripcion,
    amount: Number(movement.monto),
    paidBy: movement.pagado_por,
    recipient: movement.receptor ?? undefined,
    category: movement.categoria,
    divisionMethod: movement.division_method ?? undefined,
    participants: participants.map((item) => item.miembro_id),
    participantShares: Object.fromEntries(
      participants.map((item) => [item.miembro_id, Number(item.monto_parte)]),
    ),
    createdAt: movement.creado_en,
    groupId: movement.grupo_id,
  };
}

export async function GET(request: NextRequest) {
  const groupIdParam = request.nextUrl.searchParams.get('group_id');
  const query = groupIdParam === null ? null : groupIdQuerySchema.safeParse({ group_id: groupIdParam });
  if (query && !query.success) return validationResponse(query.error);
  const groupId = query?.success ? query.data.group_id : null;

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    const { data: groups, error: groupsError } = await supabase.from('grupos').select('id, nombre');
    if (groupsError) return internalErrorResponse();
    const groupNames = new Map((groups ?? []).map((group) => [group.id, group.nombre]));
    const movements: DatabaseMovement[] = [];

    if (!groupId || groupNames.has(groupId)) {
      for (let offset = 0; ; offset += 1000) {
        let movementQuery = supabase
          .from('movimientos')
          .select('id, grupo_id, tipo, descripcion, monto, moneda, categoria, division_method, pagado_por, receptor, creado_en, movimiento_participantes(miembro_id, monto_parte)');
        if (groupId) movementQuery = movementQuery.eq('grupo_id', groupId);

        const { data, error } = await movementQuery
          .order('creado_en', { ascending: false })
          .order('id', { ascending: false })
          .range(offset, offset + 999);
        if (error) return internalErrorResponse();

        const page = (data ?? []) as DatabaseMovement[];
        movements.push(...page);
        if (page.length < 1000) break;
      }
    }

    const response = NextResponse.json({
      movements: movements.map((movement) => ({
        ...mapMovement(movement),
        groupName: groupNames.get(movement.grupo_id) ?? 'Grupo',
      })),
    });
    response.headers.set('Cache-Control', 'private, no-store');
    applyCookies(response);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Supabase no está configurado')) {
      return configurationErrorResponse();
    }
    return internalErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  if ('response' in body) return body.response;

  const parsed = createMovementSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    let participantShares: Record<string, number> | null = null;
    if (parsed.data.kind === 'expense') {
      const method = parsed.data.divisionMethod ?? 'equal';
      if (method === 'equal') {
        participantShares = splitAmountEquallyByMemberId(parsed.data.amount, parsed.data.participants);
      } else if (method === 'consumption') {
        participantShares = parsed.data.participantShares ?? null;
      } else {
        const { data: incomeShares, error: incomeError } = await supabase.rpc('previsualizar_division_por_ingresos', {
          p_grupo_id: parsed.data.groupId,
          p_monto: parsed.data.amount,
          p_miembros: parsed.data.participants,
        });
        if (incomeError) {
          if (incomeError.message.includes('INCOME_REQUIRED_FOR_EACH_PARTICIPANT')) {
            return errorResponse(
              'INCOME_REQUIRED',
              'Todas las personas seleccionadas deben tener un ingreso mensual cargado en su cuenta para usar este reparto.',
              422,
            );
          }
          if (incomeError.message.includes('GROUP_MEMBERSHIP_REQUIRED') || incomeError.message.includes('INCOME_SPLIT_MEMBER_OUTSIDE_GROUP')) {
            return errorResponse('GROUP_ACCESS_DENIED', 'No tenés acceso a ese grupo o a sus integrantes.', 403);
          }
          return internalErrorResponse();
        }
        participantShares = Object.fromEntries(
          ((incomeShares ?? []) as Array<{ miembro_id: string; monto_parte: number | string }>)
            .map((share) => [share.miembro_id, Number(share.monto_parte)]),
        );
      }
      if (!participantShares || Object.keys(participantShares).length !== parsed.data.participants.length) {
        return errorResponse('INVALID_SPLIT', 'No se pudo calcular el reparto del gasto.', 400);
      }
    }

    const movementPayload = {
      grupo_id: parsed.data.groupId,
      tipo: parsed.data.kind === 'loan' ? 'prestamo' : 'gasto',
      descripcion: parsed.data.description,
      monto: roundCurrency(parsed.data.amount),
      moneda: 'ARS',
      categoria: parsed.data.kind === 'loan' ? 'Préstamo' : parsed.data.category,
      division_method: parsed.data.kind === 'loan' ? null : parsed.data.divisionMethod ?? 'equal',
      pagado_por: parsed.data.paidBy,
      receptor: parsed.data.kind === 'loan' ? parsed.data.recipient : null,
    };

    const { data: movement, error: movementError } = await supabase
      .from('movimientos')
      .insert(movementPayload)
      .select('id, grupo_id, tipo, descripcion, monto, moneda, categoria, pagado_por, receptor, creado_en')
      .single();
    if (movementError || !movement) return internalErrorResponse();

    if (parsed.data.kind === 'expense') {
      const participantRows = parsed.data.participants.map((memberId) => ({
        movimiento_id: movement.id,
        grupo_id: parsed.data.groupId,
        miembro_id: memberId,
        monto_parte: participantShares?.[memberId] ?? 0,
      }));

      const { error: participantsError } = await supabase
        .from('movimiento_participantes')
        .insert(participantRows);

      if (participantsError) {
        await supabase.from('movimientos').delete().eq('id', movement.id);
        return internalErrorResponse();
      }
    }

    const { data: completeMovement, error: completeMovementError } = await supabase
      .from('movimientos')
      .select('id, grupo_id, tipo, descripcion, monto, moneda, categoria, division_method, pagado_por, receptor, creado_en, movimiento_participantes(miembro_id, monto_parte)')
      .eq('id', movement.id)
      .single();
    if (completeMovementError || !completeMovement) return internalErrorResponse();

    const response = NextResponse.json({ movement: mapMovement(completeMovement as DatabaseMovement) }, { status: 201 });
    response.headers.set('Cache-Control', 'private, no-store');
    applyCookies(response);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Supabase no está configurado')) {
      return configurationErrorResponse();
    }
    return internalErrorResponse();
  }
}

const movementIdSchema = z.string().uuid();

export async function PATCH(request: NextRequest) {
  const body = await readJson(request);
  if ('response' in body) return body.response;

  const movementId = typeof body.data === 'object' && body.data !== null && 'movementId' in body.data
    ? movementIdSchema.safeParse(body.data.movementId)
    : null;
  if (!movementId?.success) {
    return errorResponse('VALIDATION_ERROR', 'El movimiento que querés editar no es válido.', 400);
  }

  const parsed = createMovementSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    const { error: updateError } = await supabase.rpc('actualizar_movimiento', {
      p_movimiento_id: movementId.data,
      p_grupo_id: parsed.data.groupId,
      p_tipo: parsed.data.kind === 'loan' ? 'prestamo' : 'gasto',
      p_descripcion: parsed.data.description,
      p_monto: roundCurrency(parsed.data.amount),
      p_categoria: parsed.data.kind === 'loan' ? 'Préstamo' : parsed.data.category,
      p_division_method: parsed.data.kind === 'loan' ? null : parsed.data.divisionMethod ?? 'equal',
      p_pagado_por: parsed.data.paidBy,
      p_receptor: parsed.data.kind === 'loan' ? parsed.data.recipient ?? null : null,
      p_participantes: parsed.data.kind === 'loan' ? [] : parsed.data.participants,
      p_partes: parsed.data.kind === 'expense' && parsed.data.divisionMethod === 'consumption'
        ? parsed.data.participantShares ?? {}
        : {},
    });
    if (updateError) {
      if (updateError.message.includes('MOVEMENT_HAS_PAYMENT')) {
        return errorResponse('MOVEMENT_LOCKED', 'No se puede editar un movimiento con pagos reportados o confirmados.', 409);
      }
      if (updateError.message.includes('GROUP_MEMBERSHIP_REQUIRED')) {
        return errorResponse('GROUP_ACCESS_DENIED', 'No tenés acceso a ese grupo.', 403);
      }
      if (updateError.message.includes('INCOME_REQUIRED_FOR_EACH_PARTICIPANT')) {
        return errorResponse('INCOME_REQUIRED', 'Todas las personas seleccionadas deben tener un ingreso mensual cargado en su cuenta.', 422);
      }
      if (updateError.message.includes('MOVEMENT_NOT_FOUND')) {
        return errorResponse('MOVEMENT_NOT_FOUND', 'No encontramos el movimiento en este grupo.', 404);
      }
      return internalErrorResponse();
    }

    const { data: updatedMovement, error: fetchError } = await supabase
      .from('movimientos')
      .select('id, grupo_id, tipo, descripcion, monto, moneda, categoria, division_method, pagado_por, receptor, creado_en, movimiento_participantes(miembro_id, monto_parte)')
      .eq('id', movementId.data)
      .single();
    if (fetchError || !updatedMovement) return internalErrorResponse();

    const response = NextResponse.json({ movement: mapMovement(updatedMovement as DatabaseMovement) });
    response.headers.set('Cache-Control', 'private, no-store');
    applyCookies(response);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Supabase no está configurado')) {
      return configurationErrorResponse();
    }
    return internalErrorResponse();
  }
}
