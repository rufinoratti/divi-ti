import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

import { createInvitationSchema } from '@/lib/api/schemas';
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

  const parsed = createInvitationSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    const token = randomBytes(32).toString('hex');
    const { data, error } = await supabase
      .from('invitaciones')
      .insert({
        grupo_id: parsed.data.groupId,
        email: parsed.data.email,
        nombre: parsed.data.name ?? null,
        token,
        creada_por: userData.user.id,
      })
      .select('id, grupo_id, email, nombre, estado, creada_en')
      .single();

    if (error) {
      if (error.code === '23505') {
        return errorResponse('INVITATION_EXISTS', 'Ya existe una invitación pendiente para ese email.', 409);
      }
      if (error.code === '42501') {
        return errorResponse('FORBIDDEN', 'Solo quien creó el grupo puede invitar integrantes.', 403);
      }
      return internalErrorResponse();
    }

    const response = NextResponse.json(
      {
        invitation: {
          ...data,
          inviteUrl: `${new URL(request.url).origin}/invite/${token}`,
        },
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
