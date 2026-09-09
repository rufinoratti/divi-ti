import { NextRequest, NextResponse } from 'next/server';
import {
  authErrorResponse,
  configurationErrorResponse,
  internalErrorResponse,
} from '@/lib/auth/http';
import { createSupabaseRouteClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true, message: 'Sesión cerrada.' });
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { error } = await supabase.auth.signOut();

    if (error) return authErrorResponse(error, 401, 'No pudimos cerrar la sesión.');

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
