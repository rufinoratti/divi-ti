import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/auth/schemas';
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

  const parsed = loginSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error || !data.user || !data.session) {
      return authErrorResponse(
        error,
        401,
        'No pudimos iniciar sesión con esos datos.',
      );
    }

    const response = NextResponse.json(
      {
        user: serializeUser(data.user),
        session: serializeSession(data.session),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-store',
          Vary: 'Cookie',
        },
      },
    );

    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Vary', 'Cookie');
    applyCookies(response);

    return response;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Supabase no está configurado')) {
      return configurationErrorResponse();
    }

    return internalErrorResponse();
  }
}
