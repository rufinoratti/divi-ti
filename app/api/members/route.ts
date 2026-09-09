import { NextRequest, NextResponse } from 'next/server';

import { createMemberSchema, groupIdQuerySchema } from '@/lib/api/schemas';
import {
  authErrorResponse,
  configurationErrorResponse,
  internalErrorResponse,
  readJson,
  validationResponse,
} from '@/lib/auth/http';
import { createSupabaseRouteClient } from '@/lib/supabase/server';

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
      .from('miembros')
      .select('id, grupo_id, nombre, iniciales, usuario_id, creado_en')
      .eq('grupo_id', groupId)
      .order('creado_en', { ascending: true });
    if (error) return internalErrorResponse();

    const response = NextResponse.json({ members: data ?? [] });
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

  const parsed = createMemberSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    const { data, error } = await supabase
      .from('miembros')
      .insert({
        grupo_id: parsed.data.groupId,
        nombre: parsed.data.name,
        iniciales: parsed.data.initials,
        usuario_id: parsed.data.userId ?? null,
      })
      .select('id, grupo_id, nombre, iniciales, usuario_id, creado_en')
      .single();
    if (error || !data) return internalErrorResponse();

    const response = NextResponse.json({ member: data }, { status: 201 });
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
