'use client';

import { useState, useCallback, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type AuthSessionPayload } from '@/lib/auth/types';
import { type Member } from '@/lib/ledger';

interface AuthState {
  userId: string | null;
  email: string | null;
  memberId: string | null;
  members: Member[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    userId: null,
    email: null,
    memberId: null,
    members: [],
    isAuthenticated: false,
    isLoading: true,
  });

  const setAuthState = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setState({
          userId: null,
          email: null,
          memberId: null,
          members: [],
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      const userId = data.user.id;
      const email = data.user.email ?? null;
      const { data: members } = await supabase
        .from('miembros')
        .select('id, nombre, iniciales')
        .eq('usuario_id', userId);
      const memberList = (members ?? []).map((member) => ({
        id: member.id,
        name: member.nombre,
        initials: member.iniciales,
      })) as Member[];
      const memberId = memberList.length > 0 ? memberList[0].id : null;
      setState({ userId, email, memberId, members: memberList, isAuthenticated: true, isLoading: false });
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const setSession = useCallback(async (session: AuthSessionPayload) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error('Supabase no está configurado.');

    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (error) throw error;
    await setAuthState();
  }, [setAuthState]);

  const login = useCallback((session: AuthSessionPayload) => setSession(session), [setSession]);

  const signup = useCallback((session: AuthSessionPayload) => setSession(session), [setSession]);

  const logout = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();

    try {
      // El endpoint limpia las cookies SSR; el cliente limpia su sesión local.
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}

    try {
      if (supabase) await supabase.auth.signOut();
    } catch {}

    setState({ userId: null, email: null, memberId: null, members: [], isAuthenticated: false, isLoading: false });
  }, []);

  useEffect(() => {
    void setAuthState();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return undefined;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setState({ userId: null, email: null, memberId: null, members: [], isAuthenticated: false, isLoading: false });
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setTimeout(() => { void setAuthState(); }, 0);
      }
    });
    return () => { subscription.unsubscribe(); };
  }, [setAuthState]);

  return { ...state, login, signup, logout };
}
