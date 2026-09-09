import { NextRequest, NextResponse } from 'next/server';

import { forgotPasswordSchema } from '@/lib/auth/schemas';
import {
  authErrorResponse,
  configurationErrorResponse,
  internalErrorResponse,
  readJson,
  validationResponse,
} from '@/lib/auth/http';
import { createSupabaseRouteClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  if ('response' in body) return body.response;

  const parsed = forgotPasswordSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${new URL(request.url).origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      return authErrorResponse(
        error,
        400,
        'No pudimos enviar el email de recuperación.',
      );
    }

    const response = NextResponse.json({
      ok: true,
      message: 'Si existe una cuenta con ese email, vas a recibir un enlace para recuperar tu contraseña.',
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
