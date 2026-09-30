import { NextRequest, NextResponse } from 'next/server';

import { createMovementSchema, groupIdQuerySchema } from '@/lib/api/schemas';
import { roundCurrency, splitAmountEqually } from '@/lib/ledger';
import {
  authErrorResponse,
  configurationErrorResponse,
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
          .select('id, grupo_id, tipo, descripcion, monto, moneda, categoria, pagado_por, receptor, creado_en, movimiento_participantes(miembro_id, monto_parte)');
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

    const movementPayload = {
      grupo_id: parsed.data.groupId,
      tipo: parsed.data.kind === 'loan' ? 'prestamo' : 'gasto',
      descripcion: parsed.data.description,
      monto: roundCurrency(parsed.data.amount),
      moneda: 'ARS',
      categoria: parsed.data.kind === 'loan' ? 'Préstamo' : parsed.data.category,
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
      const shares = splitAmountEqually(movementPayload.monto, parsed.data.participants.length);
      const participantRows = parsed.data.participants.map((memberId, index) => ({
        movimiento_id: movement.id,
        grupo_id: parsed.data.groupId,
        miembro_id: memberId,
        monto_parte: shares[index],
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
      .select('id, grupo_id, tipo, descripcion, monto, moneda, categoria, pagado_por, receptor, creado_en, movimiento_participantes(miembro_id, monto_parte)')
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
