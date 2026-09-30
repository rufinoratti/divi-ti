import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

import { createGroupSchema } from '@/lib/api/schemas';
import { calculateBalances, type LedgerMovement, type Member } from '@/lib/ledger';
import {
  authErrorResponse,
  configurationErrorResponse,
  internalErrorResponse,
  readJson,
  serializeUser,
  validationResponse,
} from '@/lib/auth/http';
import { createSupabaseRouteClient } from '@/lib/supabase/server';

type GroupMember = {
  id: string;
  nombre: string;
  iniciales: string;
  usuario_id: string | null;
};

type GroupRecord = {
  id: string;
  nombre: string;
  creado_por: string | null;
  creado_en: string;
  codigo_union: string;
  miembros: GroupMember[];
};

type DatabaseMovement = {
  id: string;
  grupo_id: string;
  tipo: 'gasto' | 'prestamo';
  descripcion: string;
  monto: number | string;
  categoria: string;
  pagado_por: string;
  receptor: string | null;
  creado_en: string;
  movimiento_participantes?: Array<{ miembro_id: string; monto_parte: number | string }>;
};

function mapGroupMovement(movement: DatabaseMovement): LedgerMovement {
  const participants = movement.movimiento_participantes ?? [];
  return {
    id: movement.id,
    kind: movement.tipo === 'prestamo' ? 'loan' : 'expense',
    description: movement.descripcion,
    amount: Number(movement.monto),
    paidBy: movement.pagado_por,
    recipient: movement.receptor ?? undefined,
    category: movement.categoria as LedgerMovement['category'],
    participants: participants.map((participant) => participant.miembro_id),
    participantShares: Object.fromEntries(
      participants.map((participant) => [participant.miembro_id, Number(participant.monto_parte)]),
    ),
    createdAt: movement.creado_en,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    const { data, error } = await supabase
      .from('grupos')
      .select('id, nombre, codigo_union, creado_por, creado_en')
      .order('creado_en', { ascending: false });
    if (error) return internalErrorResponse();

    const groups: GroupRecord[] = [];
    for (const group of data ?? []) {
      const { data: members, error: membersError } = await supabase
        .from('miembros')
        .select('id, nombre, iniciales, usuario_id')
        .eq('grupo_id', group.id)
        .order('creado_en', { ascending: true });

      if (membersError) return internalErrorResponse();
      groups.push({ ...group, miembros: members ?? [] });
    }

    const balancesByGroup = new Map<string, number>();
    if (groups.length > 0) {
      const { data: movementData, error: movementError } = await supabase
        .from('movimientos')
        .select('id, grupo_id, tipo, descripcion, monto, categoria, pagado_por, receptor, creado_en, movimiento_participantes(miembro_id, monto_parte)')
        .in('grupo_id', groups.map((group) => group.id));

      if (movementError) return internalErrorResponse();

      const movementsByGroup = new Map<string, LedgerMovement[]>();
      for (const rawMovement of movementData ?? []) {
        const movement = rawMovement as DatabaseMovement;
        const groupMovements = movementsByGroup.get(movement.grupo_id) ?? [];
        groupMovements.push(mapGroupMovement(movement));
        movementsByGroup.set(movement.grupo_id, groupMovements);
      }

      for (const group of groups) {
        const currentMember = group.miembros.find((member) => member.usuario_id === userData.user.id);
        if (!currentMember) {
          balancesByGroup.set(group.id, 0);
          continue;
        }

        const ledgerMembers: Member[] = group.miembros.map((member) => ({
          id: member.id,
          name: member.nombre,
          initials: member.iniciales,
        }));
        const balances = calculateBalances(ledgerMembers, movementsByGroup.get(group.id) ?? []);
        balancesByGroup.set(group.id, balances[currentMember.id] ?? 0);
      }
    }

    const groupsWithBalances = groups.map((group) => ({
      ...group,
      balance_personal: balancesByGroup.get(group.id) ?? 0,
    }));

    const response = NextResponse.json({ groups: groupsWithBalances });
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

  const parsed = createGroupSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    let group: {
      id: string;
      nombre: string;
      codigo_union: string;
      creado_por: string | null;
      creado_en: string;
    } | null = null;

    for (let attempt = 0; attempt < 5 && !group; attempt += 1) {
      const codigoUnion = randomBytes(6).toString('hex').toUpperCase();
      const { data: createdGroup, error: groupError } = await supabase
        .from('grupos')
        .insert({ nombre: parsed.data.name, codigo_union: codigoUnion, creado_por: userData.user.id })
        .select('id, nombre, codigo_union, creado_por, creado_en')
        .single();

      if (!groupError && createdGroup) {
        group = createdGroup;
        break;
      }

      if (groupError?.code !== '23505') return internalErrorResponse();
    }

    if (!group) return internalErrorResponse();

    const memberName = parsed.data.memberName ?? userData.user.user_metadata?.display_name ?? userData.user.email?.split('@')[0] ?? 'Yo';
    const initials = memberName
      .split(/\s+/)
      .map((part: string) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const { data: member, error: memberError } = await supabase
      .from('miembros')
      .insert({
        grupo_id: group.id,
        nombre: memberName,
        iniciales: initials,
        usuario_id: userData.user.id,
      })
      .select('id, nombre, iniciales, usuario_id')
      .single();

    if (memberError || !member) {
      await supabase.from('grupos').delete().eq('id', group.id);
      return internalErrorResponse();
    }

    const response = NextResponse.json(
      { group: { ...group, miembros: [member] }, user: serializeUser(userData.user) },
      { status: 201 },
    );
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
