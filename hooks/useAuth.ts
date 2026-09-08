'use client';

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }
      const userId = session.user.id;
      const email = session.user.email ?? null;
      const { data: members } = await supabase.from('miembros').select('*').eq('usuario_id', userId);
      const memberList = (members ?? []) as Member[];
      const memberId = memberList.length > 0 ? memberList[0].id : null;
      setState({ userId, email, memberId, members: memberList, isAuthenticated: true, isLoading: false });
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback((userId: string, email: string) => {
    setState((prev) => ({ ...prev, userId, email, isAuthenticated: true, isLoading: false }));
  }, []);

  const signup = useCallback((userId: string, email: string) => {
    setState((prev) => ({ ...prev, userId, email, isAuthenticated: true, isLoading: false }));
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ userId: null, email: null, memberId: null, members: [], isAuthenticated: false, isLoading: false });
  }, []);

  useEffect(() => {
    setAuthState();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setState({ userId: null, email: null, memberId: null, members: [], isAuthenticated: false, isLoading: false });
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setAuthState();
      }
    });
    return () => { subscription.unsubscribe(); };
  }, [setAuthState]);

  return { ...state, login, signup, logout };
}
