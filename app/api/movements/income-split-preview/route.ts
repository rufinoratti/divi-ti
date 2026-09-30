import { NextRequest, NextResponse } from 'next/server';

import { incomeSplitPreviewSchema } from '@/lib/api/schemas';
import {
  authErrorResponse,
  configurationErrorResponse,
  errorResponse,
  internalErrorResponse,
  readJson,
  validationResponse,
} from '@/lib/auth/http';
import { createSupabaseRouteClient } from '@/lib/supabase/server';

type IncomeShareRow = { miembro_id: string; monto_parte: number | string };

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  if ('response' in body) return body.response;

  const parsed = incomeSplitPreviewSchema.safeParse(body.data);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return authErrorResponse(userError, 401, 'Necesitás iniciar sesión.');

    const { data, error } = await supabase.rpc('previsualizar_division_por_ingresos', {
      p_grupo_id: parsed.data.groupId,
      p_monto: parsed.data.amount,
      p_miembros: parsed.data.participants,
    });

    if (error) {
      if (error.message.includes('INCOME_REQUIRED_FOR_EACH_PARTICIPANT')) {
        return errorResponse(
          'INCOME_REQUIRED',
          'Todas las personas seleccionadas deben tener un ingreso mensual cargado en su cuenta para usar este reparto.',
          422,
        );
      }
      if (error.message.includes('GROUP_MEMBERSHIP_REQUIRED') || error.message.includes('INCOME_SPLIT_MEMBER_OUTSIDE_GROUP')) {
        return errorResponse('GROUP_ACCESS_DENIED', 'No tenés acceso a ese grupo o a sus integrantes.', 403);
      }
      if (error.message.includes('AMOUNT_TOO_SMALL_FOR_PARTICIPANT_COUNT')) {
        return errorResponse('AMOUNT_TOO_SMALL', 'El importe debe alcanzar para asignar al menos un centavo a cada participante.', 400);
      }
      return internalErrorResponse();
    }

    const shares = ((data ?? []) as IncomeShareRow[]).map((share) => ({
      memberId: share.miembro_id,
      amount: Number(share.monto_parte),
    }));
    const response = NextResponse.json(
      { shares },
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
