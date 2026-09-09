import { NextRequest, NextResponse } from 'next/server';

import { createGroupSchema } from '@/lib/api/schemas';
import {
  authErrorResponse,
  configurationErrorResponse,
  internalErrorResponse,
  readJson,
  serializeUser,
  validationResponse,
} from '@/lib/auth/http';
import { createSupabaseRouteClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    const { data, error } = await supabase
      .from('grupos')
      .select('id, nombre, creado_por, creado_en')
      .order('creado_en', { ascending: false });
    if (error) return internalErrorResponse();

    const groups = [];
    for (const group of data ?? []) {
      const { data: members, error: membersError } = await supabase
        .from('miembros')
        .select('id, nombre, iniciales, usuario_id')
        .eq('grupo_id', group.id)
        .order('creado_en', { ascending: true });

      if (membersError) return internalErrorResponse();
      groups.push({ ...group, miembros: members ?? [] });
    }

    const response = NextResponse.json({ groups });
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

    const { data: group, error: groupError } = await supabase
      .from('grupos')
      .insert({ nombre: parsed.data.name, creado_por: userData.user.id })
      .select('id, nombre, creado_por, creado_en')
      .single();
    if (groupError || !group) return internalErrorResponse();

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
