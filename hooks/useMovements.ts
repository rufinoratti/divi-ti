'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { type Member, type LedgerMovement, calculateBalances, calculateSettlements } from '@/lib/ledger';

export type Tab = 'inicio' | 'actividad' | 'balance' | 'perfil';

export function useMovements(memberId?: string) {
  const [members, setMembers] = useState<Member[]>([]);
  const [movements, setMovements] = useState<LedgerMovement[]>([]);
  const [groupName, setGroupName] = useState<string>('');
  const [groupOwnerId, setGroupOwnerId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshMovements = useCallback(async () => {
    setIsReady(false);
    setMembers([]);
    setMovements([]);
    setGroupId(null);
    setGroupName('');
    setGroupOwnerId(null);

    try {
      const groupsResponse = await fetch('/api/groups', { cache: 'no-store' });
      if (!groupsResponse.ok) return [];

      const groupsData = await groupsResponse.json() as {
        groups?: Array<{
          id: string;
          nombre: string;
          creado_por: string | null;
          miembros?: Array<{ id: string; nombre: string; iniciales: string }>;
        }>;
      };
      const group = groupsData.groups?.[0];
      if (!group) return [];

      setGroupId(group.id);
      setGroupName(group.nombre || 'Grupo');
      setGroupOwnerId(group.creado_por);
      setMembers((group.miembros ?? []).map((member) => ({
        id: member.id,
        name: member.nombre,
        initials: member.iniciales,
      })));

      const movementsResponse = await fetch(`/api/movements?group_id=${encodeURIComponent(group.id)}`, { cache: 'no-store' });
      if (!movementsResponse.ok) return [];

      const movementsData = await movementsResponse.json() as { movements?: LedgerMovement[] };
      const nextMovements = movementsData.movements ?? [];
      setMovements(nextMovements);
      return nextMovements;
    } catch {
      return [];
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshMovements();
  }, [memberId, refreshMovements]);

  const persistMovement = useCallback(async (movement: LedgerMovement, method: 'POST' | 'PUT') => {
    if (!groupId) throw new Error('Todavía no encontramos un grupo activo para guardar el movimiento.');

    const response = await fetch('/api/movements', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(method === 'PUT' ? { movementId: movement.id } : {}),
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

    const data = await response.json().catch(() => null) as {
      error?: { message?: string; fields?: Record<string, string[]> };
      movement?: LedgerMovement;
    } | null;
    if (!response.ok) {
      const fieldMessages = data?.error?.fields
        ? Object.entries(data.error.fields).flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`))
        : [];
      throw new Error(fieldMessages.join(' ') || data?.error?.message || 'No pudimos guardar el movimiento. Probá de nuevo.');
    }

    if (!data?.movement) throw new Error('El servidor no devolvió el movimiento guardado.');
    if (method === 'POST') {
      setMovements((current) => [data.movement!, ...current]);
    } else {
      setMovements((current) => current.map((item) => item.id === movement.id ? data.movement! : item));
    }
  }, [groupId]);

  const addMovement = useCallback((movement: LedgerMovement) => persistMovement(movement, 'POST'), [persistMovement]);
  const updateMovement = useCallback((movement: LedgerMovement) => persistMovement(movement, 'PUT'), [persistMovement]);

  const balances = useMemo(() => calculateBalances(members, movements), [movements, members]);
  const settlements = useMemo(() => calculateSettlements(members, balances), [balances]);

  return { movements, isReady, addMovement, updateMovement, refreshMovements, balances, settlements, members, groupId, groupName, groupOwnerId };
}
