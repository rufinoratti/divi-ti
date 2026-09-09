import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';

import { getSupabaseConfigError, supabasePublishableKey, supabaseUrl } from './config';

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export function createSupabaseRouteClient(request: NextRequest) {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw getSupabaseConfigError();
  }

  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet, headers) {
        pendingCookies.push(...cookiesToSet);
        Object.assign(pendingHeaders, headers);
      },
    },
  });

  return {
    supabase,
    applyCookies(response: NextResponse) {
      for (const cookie of pendingCookies) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      }

      for (const [name, value] of Object.entries(pendingHeaders)) {
        response.headers.set(name, value);
      }
    },
  };
}
