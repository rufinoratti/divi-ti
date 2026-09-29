import { NextRequest, NextResponse } from 'next/server';

import { groupJoinCodeSchema } from '@/lib/api/schemas';
import {
  authErrorResponse,
  configurationErrorResponse,
  errorResponse,
  internalErrorResponse,
  readJson,
  validationResponse,
} from '@/lib/auth/http';
import { createSupabaseRouteClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  if ('response' in body) return body.response;

  const parsed = groupJoinCodeSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return authErrorResponse(userError, 401, 'Necesitás iniciar sesión para unirte a un grupo.');
    }

    const { data, error } = await supabase.rpc('unirse_a_grupo_por_codigo', {
      p_codigo: parsed.data.code,
    });

    if (error) {
      if (error.code === 'P0002') {
        return errorResponse('GROUP_CODE_NOT_FOUND', 'No encontramos un grupo con ese código.', 404);
      }
      if (error.code === '28000') {
        return authErrorResponse(error, 401, 'Necesitás iniciar sesión para unirte a un grupo.');
      }
      return internalErrorResponse();
    }

    const membership = data as {
      alreadyMember?: boolean;
      group?: { nombre?: string };
    } | null;
    const groupName = membership?.group?.nombre;
    const message = membership?.alreadyMember
      ? `Ya pertenecés al grupo ${groupName ?? 'indicado'}.`
      : `Te sumaste al grupo ${groupName ?? 'correctamente'}.`;
    const response = NextResponse.json(
      { membership: data, message },
      { status: membership?.alreadyMember ? 200 : 201 },
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
