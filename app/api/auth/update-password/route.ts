import { NextRequest, NextResponse } from 'next/server';

import { updatePasswordSchema } from '@/lib/auth/schemas';
import {
  authErrorResponse,
  configurationErrorResponse,
  internalErrorResponse,
  readJson,
  serializeUser,
  validationResponse,
} from '@/lib/auth/http';
import { createSupabaseRouteClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  if ('response' in body) return body.response;

  const parsed = updatePasswordSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return authErrorResponse(userError, 401, 'El enlace de recuperación ya no es válido.');
    }

    const { data, error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error || !data.user) {
      return authErrorResponse(error, 400, 'No pudimos actualizar la contraseña.');
    }

    const response = NextResponse.json({
      ok: true,
      user: serializeUser(data.user),
      message: 'Tu contraseña fue actualizada correctamente.',
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
