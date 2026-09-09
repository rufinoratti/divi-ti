import { NextRequest, NextResponse } from 'next/server';

import { getSafeNextPath } from '@/lib/auth/http';
import { createSupabaseRouteClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const nextPath = getSafeNextPath(request.nextUrl.searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=El enlace de autenticación no es válido.', request.url),
    );
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url));

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL('/login?error=No pudimos validar el enlace de autenticación.', request.url),
      );
    }

    applyCookies(response);
    return response;
  } catch {
    return NextResponse.redirect(
      new URL('/login?error=El servicio de autenticación no está configurado.', request.url),
    );
  }
}
