import { NextRequest, NextResponse } from 'next/server';

import { invitationTokenSchema } from '@/lib/api/schemas';
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

  const parsed = invitationTokenSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión para aceptar la invitación.');

    const { data: invitation, error: invitationError } = await supabase
      .from('invitaciones')
      .select('id, grupo_id, email, nombre, estado')
      .eq('token', parsed.data.token)
      .maybeSingle();

    if (invitationError) return internalErrorResponse();
    if (!invitation) {
      return errorResponse('INVITATION_NOT_FOUND', 'La invitación no existe o no corresponde a tu email.', 404);
    }

    if (invitation.estado === 'aceptada') {
      const { data: existingMember } = await supabase
        .from('miembros')
        .select('id, grupo_id, nombre, iniciales, usuario_id')
        .eq('grupo_id', invitation.grupo_id)
        .eq('usuario_id', userData.user.id)
        .maybeSingle();

      if (existingMember) {
        const response = NextResponse.json({ member: existingMember, alreadyAccepted: true });
        response.headers.set('Cache-Control', 'private, no-store');
        applyCookies(response);
        return response;
      }

      return errorResponse('INVITATION_USED', 'Esta invitación ya fue utilizada.', 409);
    }

    const memberName = invitation.nombre
      ?? userData.user.user_metadata?.display_name
      ?? userData.user.email?.split('@')[0]
      ?? 'Integrante';
    const initials = memberName
      .split(/\s+/)
      .map((part: string) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const { data: member, error: memberError } = await supabase
      .from('miembros')
      .insert({
        grupo_id: invitation.grupo_id,
        nombre: memberName,
        iniciales: initials,
        usuario_id: userData.user.id,
        invitacion_id: invitation.id,
      })
      .select('id, grupo_id, nombre, iniciales, usuario_id')
      .single();

    if (memberError || !member) {
      if (memberError?.code === '23505') {
        return errorResponse('ALREADY_MEMBER', 'Ya pertenecés a este grupo.', 409);
      }
      if (memberError?.code === '42501') {
        return errorResponse('INVITATION_NOT_ALLOWED', 'La invitación no está habilitada para este usuario.', 403);
      }
      return internalErrorResponse();
    }

    const { error: acceptError } = await supabase
      .from('invitaciones')
      .update({
        estado: 'aceptada',
        aceptada_por: userData.user.id,
        aceptada_en: new Date().toISOString(),
      })
      .eq('id', invitation.id)
      .eq('estado', 'pendiente');

    if (acceptError) {
      await supabase.from('miembros').delete().eq('id', member.id).eq('usuario_id', userData.user.id);
      return internalErrorResponse();
    }

    const response = NextResponse.json({ member, message: 'Te sumaste al grupo correctamente.' }, { status: 201 });
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
