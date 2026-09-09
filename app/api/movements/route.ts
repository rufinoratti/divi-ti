import { NextRequest, NextResponse } from 'next/server';

import { createMovementSchema, groupIdQuerySchema } from '@/lib/api/schemas';
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
  return {
    id: movement.id,
    kind: movement.tipo === 'prestamo' ? 'loan' : 'expense',
    description: movement.descripcion,
    amount: Number(movement.monto),
    paidBy: movement.pagado_por,
    recipient: movement.receptor ?? undefined,
    category: movement.categoria,
    participants: (movement.movimiento_participantes ?? []).map((item) => item.miembro_id),
    createdAt: movement.creado_en,
  };
}

function splitAmount(amount: number, participantCount: number) {
  const cents = Math.round(amount * 100);
  const baseCents = Math.floor(cents / participantCount);
  const remainder = cents % participantCount;

  return Array.from({ length: participantCount }, (_, index) => (
    (baseCents + (index < remainder ? 1 : 0)) / 100
  ));
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
    if (movementError || !movement) return internalErrorResponse();

    if (parsed.data.kind === 'expense') {
      const shares = splitAmount(parsed.data.amount, parsed.data.participants.length);
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
