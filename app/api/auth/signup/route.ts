import { NextRequest, NextResponse } from 'next/server';
import { signupSchema } from '@/lib/auth/schemas';
import {
  authErrorResponse,
  configurationErrorResponse,
  internalErrorResponse,
  readJson,
  serializeSession,
  serializeUser,
  validationResponse,
} from '@/lib/auth/http';
import { createSupabaseRouteClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  if ('response' in body) return body.response;

  const parsed = signupSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { display_name: parsed.data.name },
      },
    });

    if (error) {
      return authErrorResponse(error, 400, 'No pudimos crear la cuenta.');
    }

    const user = data.user;
    if (!user) {
      return authErrorResponse(null, 400, 'No pudimos crear la cuenta.');
    }

    if (!data.session) {
      return authErrorResponse(
        null,
        400,
        'La cuenta fue creada, pero no hay sesión inmediata. Desactivá Confirm email en Supabase para este proyecto académico.',
      );
    }

    const response = NextResponse.json(
      {
        user: serializeUser(user),
        session: serializeSession(data.session),
        message: 'Tu cuenta fue creada correctamente.',
      },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } },
    );

    applyCookies(response);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Supabase no está configurado')) {
      return configurationErrorResponse();
    }

    return internalErrorResponse();
  }
}
