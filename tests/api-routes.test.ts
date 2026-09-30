import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSupabaseRouteClient } from '@/lib/supabase/server';
import { GET as getIncome, PUT as putIncome } from '@/app/api/profile/income/route';
import { POST as previewIncomeSplit } from '@/app/api/movements/income-split-preview/route';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseRouteClient: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json(body: unknown, init?: ResponseInit) {
      const headers = new Headers(init?.headers);
      headers.set('Content-Type', 'application/json');
      return new Response(JSON.stringify(body), { ...init, headers });
    },
  },
}));

const userId = '10000000-0000-4000-8000-000000000001';
const groupId = '30000000-0000-4000-8000-000000000003';
const memberId = '40000000-0000-4000-8000-000000000004';
const secondMemberId = '50000000-0000-4000-8000-000000000005';

function request(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as never;
}

function setRouteClient(supabase: object) {
  vi.mocked(createSupabaseRouteClient).mockReturnValue({
    supabase,
    applyCookies: vi.fn(),
  } as never);
}

function authenticatedUser() {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) } };
}

describe('income profile API routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads only the authenticated user’s profile income', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { ingreso_mensual: '850000.00' }, error: null }),
    };
    const supabase = { ...authenticatedUser(), from: vi.fn(() => query) };
    setRouteClient(supabase);

    const response = await getIncome(request('http://localhost/api/profile/income', 'GET'));
    if (!response) throw new Error('The income route returned no response.');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ income: 850000 });
    expect(supabase.from).toHaveBeenCalledWith('perfiles');
    expect(query.eq).toHaveBeenCalledWith('id', userId);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('updates only the authenticated user’s income profile', async () => {
    const query = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { ingreso_mensual: '920000.00' }, error: null }),
    };
    const supabase = { ...authenticatedUser(), from: vi.fn(() => query) };
    setRouteClient(supabase);

    const response = await putIncome(request('http://localhost/api/profile/income', 'PUT', { income: 920000 }));
    if (!response) throw new Error('The income route returned no response.');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ income: 920000 });
    expect(query.update).toHaveBeenCalledWith({ ingreso_mensual: 920000 });
    expect(query.eq).toHaveBeenCalledWith('id', userId);
  });
});

describe('income split preview API route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns calculated shares and never returns member incomes', async () => {
    const supabase = {
      ...authenticatedUser(),
      rpc: vi.fn().mockResolvedValue({
        data: [
          { miembro_id: memberId, monto_parte: '75.00' },
          { miembro_id: secondMemberId, monto_parte: '25.00' },
        ],
        error: null,
      }),
    };
    setRouteClient(supabase);

    const response = await previewIncomeSplit(request('http://localhost/api/movements/income-split-preview', 'POST', {
      groupId,
      amount: 100,
      participants: [memberId, secondMemberId],
    }));
    if (!response) throw new Error('The income preview route returned no response.');
    const result = await response.json() as { shares: Array<{ memberId: string; amount: number }>; income?: unknown };

    expect(response.status).toBe(200);
    expect(result.shares).toEqual([
      { memberId, amount: 75 },
      { memberId: secondMemberId, amount: 25 },
    ]);
    expect(result).not.toHaveProperty('income');
    for (const share of result.shares) expect(share).not.toHaveProperty('income');
    expect(supabase.rpc).toHaveBeenCalledWith('previsualizar_division_por_ingresos', {
      p_grupo_id: groupId,
      p_monto: 100,
      p_miembros: [memberId, secondMemberId],
    });
  });
});
