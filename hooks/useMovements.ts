'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { type Member, type LedgerMovement, calculateBalances, calculateSettlements } from '@/lib/ledger';
import { supabase } from '@/lib/supabase';

export type Tab = 'inicio' | 'actividad' | 'balance' | 'perfil';

export function useMovements(memberId?: string) {
  const [members, setMembers] = useState<Member[]>([]);
  const [movements, setMovements] = useState<LedgerMovement[]>([]);
  const [groupName, setGroupName] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadFromSupabase() {
      try {
        const { data: groups } = await supabase.from('grupos').select('*').limit(1);
        if (!groups || groups.length === 0) { setIsReady(true); return; }
        const groupId = groups[0].id;
        setGroupName(groups[0].nombre ?? 'Grupo');

        const { data: membersData } = await supabase.from('miembros').select('*').eq('grupo_id', groupId);
        if (membersData && membersData.length > 0) setMembers(membersData as Member[]);

        const { data: movementsData } = await supabase.from('movimientos').select('*').order('creado_en', { ascending: false });
        if (movementsData && movementsData.length > 0) setMovements(movementsData as LedgerMovement[]);
      } catch {}
      finally { setIsReady(true); }
    }
    loadFromSupabase();
  }, [memberId]);

  const addMovement = useCallback((movement: LedgerMovement) => {
    setMovements((current) => [movement, ...current]);
    const upsert = async () => {
      const { data, error: _error } = await supabase.from('movimientos').insert(movement).select().single();
      if (data) setMovements((current) => [data, ...current]);
    };
    upsert().catch(() => {});
  }, []);

  const balances = useMemo(() => calculateBalances(members, movements), [movements, members]);
  const settlements = useMemo(() => calculateSettlements(members, balances), [balances]);

  return { movements, isReady, addMovement, balances, settlements, members, groupName };
}
