import { NextRequest, NextResponse } from 'next/server';

import { profileIncomeSchema } from '@/lib/api/schemas';
import {
  authErrorResponse,
  configurationErrorResponse,
  internalErrorResponse,
  readJson,
  validationResponse,
} from '@/lib/auth/http';
import { createSupabaseRouteClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    const { data, error } = await supabase
      .from('perfiles')
      .select('ingreso_mensual')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (error || !data) return internalErrorResponse();

    const response = NextResponse.json(
      { income: data.ingreso_mensual === null ? null : Number(data.ingreso_mensual) },
      { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } },
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

export async function PUT(request: NextRequest) {
  const body = await readJson(request);
  if ('response' in body) return body.response;

  const parsed = profileIncomeSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    const { data, error } = await supabase
      .from('perfiles')
      .update({ ingreso_mensual: parsed.data.income })
      .eq('id', userData.user.id)
      .select('ingreso_mensual')
      .single();
    if (error || !data) return internalErrorResponse();

    const response = NextResponse.json(
      { income: data.ingreso_mensual === null ? null : Number(data.ingreso_mensual) },
      { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } },
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
