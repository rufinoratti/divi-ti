'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { type Member, type LedgerMovement, calculateBalances, calculateSettlements } from '@/lib/ledger';
import { ACTIVE_GROUP_STORAGE_KEY } from '@/lib/group-state';

export type Tab = 'inicio' | 'actividad' | 'balance' | 'perfil';

type GroupMemberRecord = {
  id: string;
  nombre: string;
  iniciales: string;
  usuario_id: string | null;
};

type ApiGroup = {
  id: string;
  nombre: string;
  codigo_union: string;
  creado_por: string | null;
  miembros?: GroupMemberRecord[];
};

type Group = {
  id: string;
  name: string;
  joinCode: string;
  ownerId: string | null;
  members: Member[];
  memberIdsByUserId: Record<string, string>;
};

export function useMovements(userId?: string) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [movements, setMovements] = useState<LedgerMovement[]>([]);
  const [isGroupsReady, setIsGroupsReady] = useState(false);
  const [isMovementsReady, setIsMovementsReady] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;

    setGroups([]);
    setGroupId(null);
    setMovements([]);
    setIsGroupsReady(false);
    setIsMovementsReady(false);
    setLoadedUserId(null);
    setLoadError('');

    if (!userId) {
      setIsGroupsReady(true);
      setIsMovementsReady(true);
      return () => { cancelled = true; };
    }
    const authenticatedUserId = userId;

    async function loadGroups() {
      try {
        const response = await fetch('/api/groups', { cache: 'no-store' });
        if (!response.ok) throw new Error('No se pudieron cargar los grupos.');

        const data = await response.json() as { groups?: ApiGroup[] };
        if (cancelled) return;

        const availableGroups = (data.groups ?? []).map((group) => {
          const groupMembers = group.miembros ?? [];
          return {
            id: group.id,
            name: group.nombre || 'Grupo',
            joinCode: group.codigo_union,
            ownerId: group.creado_por,
            members: groupMembers.map((member) => ({
              id: member.id,
              name: member.nombre,
              initials: member.iniciales,
            })),
            memberIdsByUserId: Object.fromEntries(
              groupMembers
                .filter((member) => member.usuario_id)
                .map((member) => [member.usuario_id!, member.id]),
            ) as Record<string, string>,
          };
        });

        let preferredGroupId: string | null = null;
        try {
          preferredGroupId = window.localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY);
        } catch {}

        const selectedGroup = availableGroups.find((group) => group.id === preferredGroupId)
          ?? availableGroups.find((group) => group.memberIdsByUserId[authenticatedUserId])
          ?? availableGroups[0];

        setGroups(availableGroups);
        setGroupId(selectedGroup?.id ?? null);
        setLoadedUserId(authenticatedUserId);
        setIsGroupsReady(true);
        if (!selectedGroup) setIsMovementsReady(true);

        if (selectedGroup) {
          try {
            window.localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, selectedGroup.id);
          } catch {}
        }
      } catch {
        if (cancelled) return;
        setGroups([]);
        setGroupId(null);
        setLoadedUserId(authenticatedUserId);
        setLoadError('No pudimos cargar tus grupos. Revisá tu conexión e intentá de nuevo.');
        setIsGroupsReady(true);
        setIsMovementsReady(true);
      }
    }

    void loadGroups();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!isGroupsReady || loadedUserId !== userId) return undefined;

    let cancelled = false;
    setIsMovementsReady(false);
    setMovements([]);

    const selectedGroupId = groupId;
    if (!selectedGroupId) {
      setIsMovementsReady(true);
      return () => { cancelled = true; };
    }

    setLoadError('');
    async function loadMovements() {
      try {
        const response = await fetch(`/api/movements?group_id=${encodeURIComponent(selectedGroupId!)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('No se pudieron cargar los movimientos.');

        const data = await response.json() as { movements?: LedgerMovement[] };
        if (!cancelled) setMovements(data.movements ?? []);
      } catch {
        if (!cancelled) setLoadError('No pudimos cargar los movimientos de este grupo. Revisá tu conexión e intentá de nuevo.');
      } finally {
        if (!cancelled) setIsMovementsReady(true);
      }
    }

    void loadMovements();
    return () => { cancelled = true; };
  }, [groupId, isGroupsReady, loadedUserId, userId]);

  const selectGroup = useCallback((nextGroupId: string) => {
    if (!groups.some((group) => group.id === nextGroupId)) return;
    if (nextGroupId === groupId) return;

    setIsMovementsReady(false);
    setMovements([]);
    setGroupId(nextGroupId);
    setLoadError('');
    try {
      window.localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, nextGroupId);
    } catch {}
  }, [groupId, groups]);

  const activeGroup = groups.find((group) => group.id === groupId) ?? null;
  const members = activeGroup?.members ?? [];
  const currentMemberId = userId ? activeGroup?.memberIdsByUserId[userId] ?? null : null;
  const groupName = activeGroup?.name ?? '';
  const groupJoinCode = activeGroup?.joinCode ?? '';
  const groupOwnerId = activeGroup?.ownerId ?? null;
  const isReady = loadedUserId === userId && isGroupsReady && isMovementsReady;

  const addMovement = useCallback(async (movement: LedgerMovement) => {
    if (!groupId) throw new Error('No hay un grupo activo para guardar el movimiento.');
    setMovements((current) => [movement, ...current]);

    try {
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
    } catch {
      setMovements((current) => current.filter((item) => item.id !== movement.id));
      throw new Error('No se pudo guardar el movimiento. Revisá los datos o tu conexión e intentá de nuevo.');
    }
  }, [groupId]);

  const balances = useMemo(() => calculateBalances(members, movements), [movements, members]);
  const settlements = useMemo(() => calculateSettlements(members, balances), [balances]);
  const groupOptions = groups.map(({ id, name }) => ({ id, name }));

  return {
    movements,
    isReady,
    loadError,
    addMovement,
    balances,
    settlements,
    members,
    currentMemberId,
    groups: groupOptions,
    groupId,
    groupName,
    groupJoinCode,
    groupOwnerId,
    selectGroup,
  };
}
