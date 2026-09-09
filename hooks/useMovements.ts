'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { type Member, type LedgerMovement, calculateBalances, calculateSettlements } from '@/lib/ledger';

export type Tab = 'inicio' | 'actividad' | 'balance' | 'perfil';

export function useMovements(memberId?: string) {
  const [members, setMembers] = useState<Member[]>([]);
  const [movements, setMovements] = useState<LedgerMovement[]>([]);
  const [groupName, setGroupName] = useState<string>('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(false);
    setMembers([]);
    setMovements([]);
    setGroupId(null);
    setGroupName('');

    async function loadFromApi() {
      try {
        const groupsResponse = await fetch('/api/groups', { cache: 'no-store' });
        if (!groupsResponse.ok) return;

        const groupsData = await groupsResponse.json() as {
          groups?: Array<{
            id: string;
            nombre: string;
            miembros?: Array<{ id: string; nombre: string; iniciales: string }>;
          }>;
        };
        const group = groupsData.groups?.[0];
        if (!group) return;

        setGroupId(group.id);
        setGroupName(group.nombre || 'Grupo');
        setMembers((group.miembros ?? []).map((member) => ({
          id: member.id,
          name: member.nombre,
          initials: member.iniciales,
        })));

        const movementsResponse = await fetch(`/api/movements?group_id=${encodeURIComponent(group.id)}`, { cache: 'no-store' });
        if (!movementsResponse.ok) return;

        const movementsData = await movementsResponse.json() as { movements?: LedgerMovement[] };
        setMovements(movementsData.movements ?? []);
      } catch {}
      finally { setIsReady(true); }
    }
    void loadFromApi();
  }, [memberId]);

  const addMovement = useCallback((movement: LedgerMovement) => {
    setMovements((current) => [movement, ...current]);
    if (!groupId) return;

    const save = async () => {
      const response = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          kind: movement.kind,
          description: movement.description,
          amount: movement.amount,
          category: movement.category,
          paidBy: movement.paidBy,
          recipient: movement.recipient ?? null,
          participants: movement.participants,
        }),
      });

      if (!response.ok) throw new Error('No se pudo guardar el movimiento.');
      const data = await response.json() as { movement?: LedgerMovement };
      if (!data.movement) throw new Error('El servidor no devolvió el movimiento.');

      setMovements((current) => current.map((item) => (
        item.id === movement.id ? data.movement! : item
      )));
    };

    save().catch(() => {
      setMovements((current) => current.filter((item) => item.id !== movement.id));
    });
  }, [groupId]);

  const balances = useMemo(() => calculateBalances(members, movements), [movements, members]);
  const settlements = useMemo(() => calculateSettlements(members, balances), [balances]);

  return { movements, isReady, addMovement, balances, settlements, members, groupName };
}
