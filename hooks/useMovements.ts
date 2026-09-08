'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { type Member, type LedgerMovement, type Settlement, calculateBalances, calculateSettlements } from '@/lib/ledger';
import { supabase } from '@/lib/supabase';

export type Tab = 'inicio' | 'actividad' | 'balance' | 'perfil';

export const defaultMembers: Member[] = [
  { id: 'martina', name: 'Martina', initials: 'MA' },
  { id: 'tomas', name: 'Tomás', initials: 'TO' },
  { id: 'valentina', name: 'Valentina', initials: 'VA' },
  { id: 'nico', name: 'Nicolás', initials: 'NI' },
];

const initialMovements: LedgerMovement[] = [
  { id: 'alquiler-septiembre', kind: 'expense', description: 'Alquiler de septiembre', amount: 360000, paidBy: 'martina', category: 'Alquiler', participants: defaultMembers.map((m) => m.id), createdAt: '2026-09-08T18:30:00.000Z' },
  { id: 'supermercado', kind: 'expense', description: 'Compra del súper', amount: 58200, paidBy: 'tomas', category: 'Compras', participants: defaultMembers.map((m) => m.id), createdAt: '2026-09-08T16:10:00.000Z' },
  { id: 'cena', kind: 'expense', description: 'Cena del viernes', amount: 32400, paidBy: 'valentina', category: 'Comida', participants: defaultMembers.map((m) => m.id), createdAt: '2026-09-07T23:15:00.000Z' },
  { id: 'taxi', kind: 'loan', description: 'Taxi de vuelta', amount: 8400, paidBy: 'martina', recipient: 'nico', category: 'Préstamo', participants: [], createdAt: '2026-09-07T06:15:00.000Z' },
];

export function useMovements() {
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [movements, setMovements] = useState<LedgerMovement[]>(initialMovements);
  const [groupName, setGroupName] = useState<string>('Grupo');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadFromSupabase() {
      try {
        const { data: groups } = await supabase.from('grupos').select('*').limit(1);
        const groupId = groups?.[0]?.id ?? 'default';
        setGroupName(groups?.[0]?.nombre ?? 'Grupo');

        const { data: membersData } = await supabase.from('miembros').select('*').eq('grupo_id', groupId);
        if (membersData && membersData.length > 0) setMembers(membersData as Member[]);

        const { data: movementsData } = await supabase.from('movimientos').select('*').order('creado_en', { ascending: false });
        if (movementsData && movementsData.length > 0) setMovements(movementsData as LedgerMovement[]);
      } catch {
        try {
          const stored = window.localStorage.getItem('divi-movements');
          if (stored) { const parsed = JSON.parse(stored); if (Array.isArray(parsed)) setMovements(parsed as LedgerMovement[]); }
        } catch {}
      } finally {
        setIsReady(true);
      }
    }
    loadFromSupabase();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem('divi-movements', JSON.stringify(movements));
  }, [isReady, movements]);

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
