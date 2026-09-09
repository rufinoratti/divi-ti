import { NextRequest, NextResponse } from 'next/server';

import { createMovementSchema, groupIdQuerySchema, updateMovementSchema } from '@/lib/api/schemas';
import {
  authErrorResponse,
  configurationErrorResponse,
  errorResponse,
  internalErrorResponse,
  readJson,
  validationResponse,
} from '@/lib/auth/http';
import { createSupabaseRouteClient } from '@/lib/supabase/server';
import { splitEqualAmount } from '@/lib/ledger';

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

function movementWriteErrorResponse(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';

  if (code === '42501') {
    return errorResponse('FORBIDDEN', 'No tenés permiso para guardar movimientos en este grupo.', 403);
  }

  if (code === '23503') {
    return errorResponse('VALIDATION_ERROR', 'El pagador o alguno de los participantes ya no pertenece a este grupo.', 400);
  }

  if (code === '23505') {
    return errorResponse('VALIDATION_ERROR', 'No se puede repetir una persona dentro del reparto.', 400);
  }

  if (code === '23514') {
    return errorResponse('VALIDATION_ERROR', 'Los datos del movimiento no cumplen las reglas del grupo.', 400);
  }

  return internalErrorResponse();
}

function mapMovement(movement: DatabaseMovement) {
  return {
    id: movement.id,
    kind: movement.tipo === 'prestamo' ? 'loan' : 'expense',
    description: movement.descripcion,
    amount: Number(movement.monto),
    paidBy: movement.pagado_por,
    recipient: movement.receptor ?? undefined,
    category: movement.categoria,
    participants: (movement.movimiento_participantes ?? []).map((item) => item.miembro_id),
    participantShares: Object.fromEntries(
      (movement.movimiento_participantes ?? []).map((item) => [item.miembro_id, Number(item.monto_parte)]),
    ),
    createdAt: movement.creado_en,
  };
}

export async function GET(request: NextRequest) {
  const query = groupIdQuerySchema.safeParse({
    group_id: request.nextUrl.searchParams.get('group_id'),
  });
  if (!query.success) return validationResponse(query.error);
  const groupId = query.data.group_id;

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    const { data, error } = await supabase
      .from('movimientos')
      .select('id, grupo_id, tipo, descripcion, monto, moneda, categoria, pagado_por, receptor, creado_en, movimiento_participantes(miembro_id, monto_parte)')
      .eq('grupo_id', groupId)
      .order('creado_en', { ascending: false });
    if (error) return internalErrorResponse();

    const response = NextResponse.json({ movements: (data ?? []).map((item) => mapMovement(item as DatabaseMovement)) });
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
      monto: Math.round(parsed.data.amount * 100) / 100,
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
    if (movementError || !movement) return movementWriteErrorResponse(movementError);

    if (parsed.data.kind === 'expense') {
      const shares = splitEqualAmount(parsed.data.amount, parsed.data.participants.length);
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
        return movementWriteErrorResponse(participantsError);
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

export async function PUT(request: NextRequest) {
  const body = await readJson(request);
  if ('response' in body) return body.response;

  const parsed = updateMovementSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    const { data: existingMovement, error: existingMovementError } = await supabase
      .from('movimientos')
      .select('id, grupo_id, tipo, descripcion, monto, moneda, categoria, pagado_por, receptor, creado_en, movimiento_participantes(miembro_id, monto_parte)')
      .eq('id', parsed.data.movementId)
      .eq('grupo_id', parsed.data.groupId)
      .single();

    if (existingMovementError || !existingMovement) {
      if (existingMovementError?.code === 'PGRST116') {
        return errorResponse('NOT_FOUND', 'No encontramos ese movimiento dentro del grupo.', 404);
      }
      return movementWriteErrorResponse(existingMovementError);
    }

    const previous = existingMovement as DatabaseMovement;
    const previousParticipants = (previous.movimiento_participantes ?? []).map((participant) => ({
      movimiento_id: previous.id,
      grupo_id: previous.grupo_id,
      miembro_id: participant.miembro_id,
      monto_parte: participant.monto_parte,
    }));
    const movementPayload = {
      tipo: parsed.data.kind === 'loan' ? 'prestamo' : 'gasto',
      descripcion: parsed.data.description,
      monto: Math.round(parsed.data.amount * 100) / 100,
      moneda: 'ARS',
      categoria: parsed.data.kind === 'loan' ? 'Préstamo' : parsed.data.category,
      pagado_por: parsed.data.paidBy,
      receptor: parsed.data.kind === 'loan' ? parsed.data.recipient : null,
    };

    const restorePreviousMovement = async () => {
      await supabase
        .from('movimientos')
        .update({
          tipo: previous.tipo,
          descripcion: previous.descripcion,
          monto: previous.monto,
          moneda: previous.moneda,
          categoria: previous.categoria,
          pagado_por: previous.pagado_por,
          receptor: previous.receptor,
        })
        .eq('id', previous.id)
        .eq('grupo_id', previous.grupo_id);
      await supabase
        .from('movimiento_participantes')
        .delete()
        .eq('movimiento_id', previous.id)
        .eq('grupo_id', previous.grupo_id);
      if (previousParticipants.length) {
        await supabase.from('movimiento_participantes').insert(previousParticipants);
      }
    };

    const { error: movementError } = await supabase
      .from('movimientos')
      .update(movementPayload)
      .eq('id', parsed.data.movementId)
      .eq('grupo_id', parsed.data.groupId);
    if (movementError) return movementWriteErrorResponse(movementError);

    const { error: deleteParticipantsError } = await supabase
      .from('movimiento_participantes')
      .delete()
      .eq('movimiento_id', parsed.data.movementId)
      .eq('grupo_id', parsed.data.groupId);
    if (deleteParticipantsError) {
      await restorePreviousMovement();
      return movementWriteErrorResponse(deleteParticipantsError);
    }

    if (parsed.data.kind === 'expense') {
      const shares = splitEqualAmount(parsed.data.amount, parsed.data.participants.length);
      const participantRows = parsed.data.participants.map((memberId, index) => ({
        movimiento_id: parsed.data.movementId,
        grupo_id: parsed.data.groupId,
        miembro_id: memberId,
        monto_parte: shares[index],
      }));
      const { error: participantsError } = await supabase
        .from('movimiento_participantes')
        .insert(participantRows);

      if (participantsError) {
        await restorePreviousMovement();
        return movementWriteErrorResponse(participantsError);
      }
    }

    const { data: completeMovement, error: completeMovementError } = await supabase
      .from('movimientos')
      .select('id, grupo_id, tipo, descripcion, monto, moneda, categoria, pagado_por, receptor, creado_en, movimiento_participantes(miembro_id, monto_parte)')
      .eq('id', parsed.data.movementId)
      .single();
    if (completeMovementError || !completeMovement) {
      await restorePreviousMovement();
      return internalErrorResponse();
    }

    const response = NextResponse.json({ movement: mapMovement(completeMovement as DatabaseMovement) });
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
