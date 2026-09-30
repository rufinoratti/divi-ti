import { NextRequest, NextResponse } from 'next/server';

import { createSettlementSchema, groupIdQuerySchema, resolveSettlementSchema } from '@/lib/api/schemas';
import { roundCurrency, toCurrencyCents, type SettlementPayment } from '@/lib/ledger';
import {
  authErrorResponse,
  configurationErrorResponse,
  errorResponse,
  internalErrorResponse,
  readJson,
  validationResponse,
} from '@/lib/auth/http';
import { createSupabaseRouteClient } from '@/lib/supabase/server';

const settlementFields = 'id, grupo_id, movimiento_id, pagador_id, receptor_id, monto, estado, reportado_por, creado_en, resuelto_por, resuelto_en';
type RouteSupabase = ReturnType<typeof createSupabaseRouteClient>['supabase'];

type ObligationMovement = {
  id: string;
  grupo_id: string;
  tipo: 'gasto' | 'prestamo';
  monto: number;
  pagado_por: string;
  receptor: string | null;
  movimiento_participantes?: Array<{ miembro_id: string; monto_parte: number }>;
};

function mapSettlement(row: Record<string, unknown>): SettlementPayment {
  return {
    id: row.id as string,
    groupId: row.grupo_id as string,
    movementId: (row.movimiento_id as string | null) ?? null,
    from: row.pagador_id as string,
    to: row.receptor_id as string,
    amount: Number(row.monto),
    status: row.estado as SettlementPayment['status'],
    reportedBy: row.reportado_por as string,
    createdAt: row.creado_en as string,
    resolvedBy: (row.resuelto_por as string | null) ?? null,
    resolvedAt: (row.resuelto_en as string | null) ?? null,
  };
}

async function getCurrentMovementObligationAmount(
  supabase: RouteSupabase,
  groupId: string,
  movementId: string,
  fromMemberId: string,
  toMemberId: string,
) {
  const { data: rawMovement, error: movementError } = await supabase
    .from('movimientos')
    .select('id, grupo_id, tipo, monto, pagado_por, receptor, movimiento_participantes(miembro_id, monto_parte)')
    .eq('id', movementId)
    .eq('grupo_id', groupId)
    .maybeSingle();
  if (movementError) throw new Error('No se pudo revisar la deuda del movimiento.');
  if (!rawMovement) return null;

  const movement = rawMovement as ObligationMovement;
  let amount = 0;
  if (movement.tipo === 'gasto' && movement.pagado_por === toMemberId && fromMemberId !== toMemberId) {
    const participant = (movement.movimiento_participantes ?? []).find((item) => item.miembro_id === fromMemberId);
    amount = Number(participant?.monto_parte ?? 0);
  } else if (movement.tipo === 'prestamo' && movement.pagado_por === toMemberId && movement.receptor === fromMemberId) {
    amount = Number(movement.monto);
  }
  if (amount <= 0) return null;

  const { data: confirmedPayments, error: paymentsError } = await supabase
    .from('liquidaciones')
    .select('monto')
    .eq('grupo_id', groupId)
    .eq('movimiento_id', movementId)
    .eq('pagador_id', fromMemberId)
    .eq('receptor_id', toMemberId)
    .eq('estado', 'confirmada');
  if (paymentsError) throw new Error('No se pudieron revisar los pagos confirmados.');

  const confirmedCents = (confirmedPayments ?? []).reduce((sum, payment) => sum + toCurrencyCents(Number(payment.monto)), 0);
  return roundCurrency(Math.max(0, toCurrencyCents(amount) - confirmedCents) / 100);
}

function settlementResponse(row: Record<string, unknown>, status = 200) {
  const response = NextResponse.json({ settlement: mapSettlement(row) }, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
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

    const settlements: Record<string, unknown>[] = [];
    for (let offset = 0; ; offset += 1000) {
      let settlementsQuery = supabase
        .from('liquidaciones')
        .select(settlementFields);
      if (groupId) settlementsQuery = settlementsQuery.eq('grupo_id', groupId);

      const { data, error } = await settlementsQuery
        .order('creado_en', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + 999);
      if (error) return internalErrorResponse();

      const page = (data ?? []) as Record<string, unknown>[];
      settlements.push(...page);
      if (page.length < 1000) break;
    }

    const response = NextResponse.json({
      settlements: settlements.map((row) => mapSettlement(row)),
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

  const parsed = createSettlementSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    const { data: members, error: membersError } = await supabase
      .from('miembros')
      .select('id, grupo_id, usuario_id')
      .eq('grupo_id', parsed.data.groupId)
      .in('id', [parsed.data.fromMemberId, parsed.data.toMemberId]);
    if (membersError) return internalErrorResponse();

    const payer = members?.find((member) => member.id === parsed.data.fromMemberId);
    const recipient = members?.find((member) => member.id === parsed.data.toMemberId);
    if (!payer || payer.usuario_id !== userData.user.id) {
      return errorResponse('FORBIDDEN', 'Solo podés informar un pago desde tu integrante del grupo.', 403);
    }
    if (!recipient?.usuario_id) {
      return errorResponse('RECIPIENT_ACCOUNT_REQUIRED', 'La otra persona necesita una cuenta vinculada para recibir la notificación.', 409);
    }

    const { data: pendingPayment, error: pendingPaymentError } = await supabase
      .from('liquidaciones')
      .select('id')
      .eq('grupo_id', parsed.data.groupId)
      .eq('movimiento_id', parsed.data.movementId)
      .eq('pagador_id', parsed.data.fromMemberId)
      .eq('receptor_id', parsed.data.toMemberId)
      .eq('estado', 'pendiente')
      .limit(1)
      .maybeSingle();
    if (pendingPaymentError) return internalErrorResponse();
    if (pendingPayment) {
      return errorResponse('PAYMENT_ALREADY_PENDING', 'Ya avisaste un pago por este gasto. Esperá la respuesta de la otra persona.', 409);
    }

    const currentAmount = await getCurrentMovementObligationAmount(
      supabase,
      parsed.data.groupId,
      parsed.data.movementId,
      parsed.data.fromMemberId,
      parsed.data.toMemberId,
    );
    if (currentAmount === null || toCurrencyCents(parsed.data.amount) > toCurrencyCents(currentAmount)) {
      return errorResponse('OBLIGATION_CHANGED', 'El monto supera lo que debés por este gasto. Actualizá la pantalla y revisá el balance.', 409);
    }

    const { data: settlement, error } = await supabase
      .from('liquidaciones')
      .insert({
        grupo_id: parsed.data.groupId,
        movimiento_id: parsed.data.movementId,
        pagador_id: parsed.data.fromMemberId,
        receptor_id: parsed.data.toMemberId,
        monto: roundCurrency(parsed.data.amount),
        reportado_por: userData.user.id,
      })
      .select(settlementFields)
      .single();

    if (error) {
      if (error.code === '23505') {
        return errorResponse('PAYMENT_ALREADY_PENDING', 'Ya avisaste un pago por este gasto. Esperá la respuesta de la otra persona.', 409);
      }
      if (error.code === '42501') return errorResponse('FORBIDDEN', 'No tenés permiso para informar este pago.', 403);
      return internalErrorResponse();
    }
    if (!settlement) return internalErrorResponse();

    const response = settlementResponse(settlement as Record<string, unknown>, 201);
    applyCookies(response);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Supabase no está configurado')) {
      return configurationErrorResponse();
    }
    return internalErrorResponse();
  }
}

export async function PATCH(request: NextRequest) {
  const body = await readJson(request);
  if ('response' in body) return body.response;

  const parsed = resolveSettlementSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    const { data: settlement, error: lookupError } = await supabase
      .from('liquidaciones')
      .select(settlementFields)
      .eq('id', parsed.data.settlementId)
      .maybeSingle();
    if (lookupError) return internalErrorResponse();
    if (!settlement) return errorResponse('SETTLEMENT_NOT_FOUND', 'No encontramos ese aviso de pago.', 404);
    if (settlement.estado !== 'pendiente') {
      return errorResponse('SETTLEMENT_ALREADY_RESOLVED', 'Este aviso de pago ya fue respondido.', 409);
    }

    const { data: recipient, error: recipientError } = await supabase
      .from('miembros')
      .select('usuario_id')
      .eq('id', settlement.receptor_id)
      .eq('grupo_id', settlement.grupo_id)
      .maybeSingle();
    if (recipientError) return internalErrorResponse();
    if (recipient?.usuario_id !== userData.user.id) {
      return errorResponse('FORBIDDEN', 'Solo la persona que recibió el pago puede responder este aviso.', 403);
    }

    if (parsed.data.action === 'confirm' && settlement.movimiento_id) {
      const currentAmount = await getCurrentMovementObligationAmount(
        supabase,
        settlement.grupo_id,
        settlement.movimiento_id,
        settlement.pagador_id,
        settlement.receptor_id,
      );
      if (currentAmount === null || toCurrencyCents(currentAmount) < toCurrencyCents(Number(settlement.monto))) {
        return errorResponse('OBLIGATION_CHANGED', 'La deuda de este gasto cambió desde que se informó el pago. Rechazá el aviso y revisen el balance.', 409);
      }
    }

    const { data: resolved, error } = await supabase
      .from('liquidaciones')
      .update({
        estado: parsed.data.action === 'confirm' ? 'confirmada' : 'rechazada',
      })
      .eq('id', parsed.data.settlementId)
      .eq('estado', 'pendiente')
      .select(settlementFields)
      .maybeSingle();

    if (error) {
      if (error.code === '42501') return errorResponse('FORBIDDEN', 'No tenés permiso para responder este aviso.', 403);
      return internalErrorResponse();
    }
    if (!resolved) return errorResponse('SETTLEMENT_ALREADY_RESOLVED', 'Este aviso ya fue respondido.', 409);

    const response = settlementResponse(resolved as Record<string, unknown>);
    applyCookies(response);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Supabase no está configurado')) {
      return configurationErrorResponse();
    }
    return internalErrorResponse();
  }
}
