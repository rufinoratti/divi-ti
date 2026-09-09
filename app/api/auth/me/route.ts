import { NextRequest, NextResponse } from 'next/server';
import {
  authErrorResponse,
  configurationErrorResponse,
  internalErrorResponse,
  serializeUser,
} from '@/lib/auth/http';
import { createSupabaseRouteClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return authErrorResponse(error, 401, 'Necesitás iniciar sesión.');
    }

    const { data: profile } = await supabase
      .from('perfiles')
      .select('id, nombre, email, avatar_url, creado_en, actualizado_en')
      .eq('id', data.user.id)
      .maybeSingle();

    const response = NextResponse.json(
      { user: serializeUser(data.user), profile: profile ?? null },
      { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } },
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
