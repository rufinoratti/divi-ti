import { NextRequest, NextResponse } from 'next/server';

import { markNotificationsReadSchema } from '@/lib/api/schemas';
import {
  authErrorResponse,
  configurationErrorResponse,
  internalErrorResponse,
  readJson,
  validationResponse,
} from '@/lib/auth/http';
import { createSupabaseRouteClient } from '@/lib/supabase/server';

type PaymentRow = {
  id: string;
  grupo_id: string;
  pagador_id: string;
  receptor_id: string;
  monto: number;
  estado: 'pendiente' | 'confirmada' | 'rechazada';
};

export async function GET(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    const { data: notifications, error } = await supabase
      .from('notificaciones')
      .select('id, liquidacion_id, tipo, creada_en, leida_en')
      .eq('usuario_id', userData.user.id)
      .order('creada_en', { ascending: false })
      .limit(50);
    if (error) return internalErrorResponse();

    const { count: unreadCount, error: unreadError } = await supabase
      .from('notificaciones')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', userData.user.id)
      .is('leida_en', null);
    if (unreadError) return internalErrorResponse();

    const paymentIds = [...new Set((notifications ?? []).map((notification) => notification.liquidacion_id))];
    const paymentResult = paymentIds.length
      ? await supabase
          .from('liquidaciones')
          .select('id, grupo_id, pagador_id, receptor_id, monto, estado')
          .in('id', paymentIds)
      : { data: [], error: null };
    if (paymentResult.error) return internalErrorResponse();

    const payments = (paymentResult.data ?? []) as PaymentRow[];
    const groupIds = [...new Set(payments.map((payment) => payment.grupo_id))];
    const memberIds = [...new Set(payments.flatMap((payment) => [payment.pagador_id, payment.receptor_id]))];
    const [groupsResult, membersResult] = await Promise.all([
      groupIds.length
        ? supabase.from('grupos').select('id, nombre').in('id', groupIds)
        : Promise.resolve({ data: [], error: null }),
      memberIds.length
        ? supabase.from('miembros').select('id, nombre').in('id', memberIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (groupsResult.error || membersResult.error) return internalErrorResponse();

    const paymentById = new Map(payments.map((payment) => [payment.id, payment]));
    const groupNameById = new Map((groupsResult.data ?? []).map((group) => [group.id, group.nombre]));
    const memberNameById = new Map((membersResult.data ?? []).map((member) => [member.id, member.nombre]));
    const enrichedNotifications = (notifications ?? []).flatMap((notification) => {
      const payment = paymentById.get(notification.liquidacion_id);
      if (!payment) return [];
      return [{
        id: notification.id,
        type: notification.tipo,
        createdAt: notification.creada_en,
        readAt: notification.leida_en,
        payment: {
          id: payment.id,
          groupId: payment.grupo_id,
          groupName: groupNameById.get(payment.grupo_id) ?? 'Grupo',
          fromMemberId: payment.pagador_id,
          fromMemberName: memberNameById.get(payment.pagador_id) ?? 'Integrante',
          toMemberId: payment.receptor_id,
          toMemberName: memberNameById.get(payment.receptor_id) ?? 'Integrante',
          amount: Number(payment.monto),
          status: payment.estado,
        },
      }];
    });
    const response = NextResponse.json({
      notifications: enrichedNotifications,
      unreadCount: unreadCount ?? 0,
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

export async function PATCH(request: NextRequest) {
  const body = await readJson(request);
  if ('response' in body) return body.response;

  const parsed = markNotificationsReadSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    const { error } = await supabase
      .from('notificaciones')
      .update({ leida_en: new Date().toISOString() })
      .eq('usuario_id', userData.user.id)
      .is('leida_en', null);
    if (error) return internalErrorResponse();

    const response = NextResponse.json({ ok: true });
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
