'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { type GroupLedger, type Member, type LedgerMovement, type SettlementPayment, calculateMovementObligations } from '@/lib/ledger';
import { ACTIVE_GROUP_STORAGE_KEY, ALL_GROUPS_SELECTION, GROUP_SELECTION_VERSION_KEY } from '@/lib/group-state';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

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
  const [payments, setPayments] = useState<SettlementPayment[]>([]);
  const [isGroupsReady, setIsGroupsReady] = useState(false);
  const [isMovementsReady, setIsMovementsReady] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const loadedScopeRef = useRef<string | null>(null);
  const refresh = useCallback(() => setRefreshToken((current) => current + 1), []);

  useEffect(() => {
    if (!userId) return undefined;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return undefined;

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(refresh, 180);
    };
    const channel = supabase
      .channel(`divi-ledger-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimiento_participantes' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'liquidaciones' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [refresh, userId]);

  useEffect(() => {
    let cancelled = false;

    setGroups([]);
    setGroupId(null);
    setMovements([]);
    setPayments([]);
    setIsGroupsReady(false);
    setIsMovementsReady(false);
    setLoadedUserId(null);
    setLoadError('');
    loadedScopeRef.current = null;

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
              userId: member.usuario_id,
            })),
            memberIdsByUserId: Object.fromEntries(
              groupMembers
                .filter((member) => member.usuario_id)
                .map((member) => [member.usuario_id!, member.id]),
            ) as Record<string, string>,
          };
        });

        let preferredGroupId: string | null = null;
        let hasExplicitSelection = false;
        try {
          preferredGroupId = window.localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY);
          hasExplicitSelection = window.localStorage.getItem(GROUP_SELECTION_VERSION_KEY) === '1';
        } catch {}

        const selectedGroup = hasExplicitSelection
          ? availableGroups.find((group) => group.id === preferredGroupId)
          : undefined;

        setGroups(availableGroups);
        setGroupId(selectedGroup?.id ?? null);
        setLoadedUserId(authenticatedUserId);
        setIsGroupsReady(true);
        if (availableGroups.length === 0) setIsMovementsReady(true);

        try {
          window.localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, selectedGroup?.id ?? ALL_GROUPS_SELECTION);
          window.localStorage.setItem(GROUP_SELECTION_VERSION_KEY, '1');
        } catch {}
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
    const selectedGroupId = groupId;
    if (!selectedGroupId && groups.length === 0) {
      setIsMovementsReady(false);
      setMovements([]);
      setPayments([]);
      setIsMovementsReady(true);
      return () => { cancelled = true; };
    }

    const scopeKey = selectedGroupId ?? ALL_GROUPS_SELECTION;
    const isRefreshingLoadedGroup = loadedScopeRef.current === scopeKey;
    if (!isRefreshingLoadedGroup) {
      setIsMovementsReady(false);
      setMovements([]);
      setPayments([]);
    }

    setLoadError('');
    async function loadMovements() {
      try {
        const groupQuery = selectedGroupId ? `?group_id=${encodeURIComponent(selectedGroupId)}` : '';
        const [movementsResponse, paymentsResponse] = await Promise.all([
          fetch(`/api/movements${groupQuery}`, { cache: 'no-store' }),
          fetch(`/api/settlements${groupQuery}`, { cache: 'no-store' }),
        ]);
        if (!movementsResponse.ok || !paymentsResponse.ok) throw new Error('No se pudieron cargar los movimientos.');

        const [movementData, paymentData] = await Promise.all([
          movementsResponse.json() as Promise<{ movements?: LedgerMovement[] }>,
          paymentsResponse.json() as Promise<{ settlements?: SettlementPayment[] }>,
        ]);
        if (!cancelled) {
          setMovements(movementData.movements ?? []);
          setPayments(paymentData.settlements ?? []);
          loadedScopeRef.current = scopeKey;
        }
      } catch {
        if (!cancelled) setLoadError('No pudimos cargar los movimientos de este grupo. Revisá tu conexión e intentá de nuevo.');
      } finally {
        if (!cancelled) setIsMovementsReady(true);
      }
    }

    void loadMovements();
    return () => { cancelled = true; };
  }, [groupId, groups, isGroupsReady, loadedUserId, refreshToken, userId]);

  const selectGroup = useCallback((nextGroupId: string | null) => {
    if (nextGroupId && !groups.some((group) => group.id === nextGroupId)) return;
    if (nextGroupId === groupId) return;

    setIsMovementsReady(false);
    setMovements([]);
    setPayments([]);
    setGroupId(nextGroupId);
    setLoadError('');
    try {
      window.localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, nextGroupId ?? ALL_GROUPS_SELECTION);
      window.localStorage.setItem(GROUP_SELECTION_VERSION_KEY, '1');
    } catch {}
  }, [groupId, groups]);

  const activeGroup = groups.find((group) => group.id === groupId) ?? null;
  const allMembers = groups.flatMap((group) => group.members);
  const members = activeGroup?.members ?? allMembers;
  const currentMemberId = userId && activeGroup ? activeGroup.memberIdsByUserId[userId] ?? null : null;
  const currentMemberIds = userId
    ? groups.map((group) => group.memberIdsByUserId[userId]).filter((memberId): memberId is string => Boolean(memberId))
    : [];
  const groupName = activeGroup?.name ?? 'Todos tus grupos';
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
          divisionMethod: movement.divisionMethod ?? 'equal',
          paidBy: movement.paidBy,
          recipient: movement.recipient ?? null,
          participants: movement.participants,
          participantShares: movement.participantShares,
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

  const updateMovement = useCallback(async (movement: LedgerMovement) => {
    if (!groupId) throw new Error('No hay un grupo activo para editar el movimiento.');
    const existing = movements.find((item) => item.id === movement.id);
    if (!existing) throw new Error('No encontramos el movimiento que querés editar.');
    setMovements((current) => current.map((item) => item.id === movement.id ? movement : item));

    try {
      const response = await fetch('/api/movements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movementId: movement.id,
          groupId,
          kind: movement.kind,
          description: movement.description,
          amount: movement.amount,
          category: movement.category,
          divisionMethod: movement.divisionMethod ?? 'equal',
          paidBy: movement.paidBy,
          recipient: movement.recipient ?? null,
          participants: movement.participants,
          participantShares: movement.participantShares,
        }),
      });
      const data = await response.json() as { movement?: LedgerMovement; error?: { message?: string } };
      if (!response.ok || !data.movement) {
        throw new Error(data.error?.message ?? 'No se pudo actualizar el movimiento.');
      }
      setMovements((current) => current.map((item) => item.id === movement.id ? data.movement! : item));
    } catch (error) {
      setMovements((current) => current.map((item) => item.id === existing.id ? existing : item));
      throw error instanceof Error
        ? error
        : new Error('No se pudo editar el movimiento. Revisá los datos o tu conexión e intentá de nuevo.');
    }
  }, [groupId, movements]);

  const obligations = useMemo(() => calculateMovementObligations(members, movements, payments), [members, movements, payments]);
  const groupLedgers = useMemo<GroupLedger[]>(() => groups.map((group) => {
    const groupMovements = movements.filter((movement) => movement.groupId === group.id);
    const groupPayments = payments.filter((payment) => payment.groupId === group.id);
    const groupObligations = calculateMovementObligations(group.members, groupMovements, groupPayments);
    return {
      id: group.id,
      name: group.name,
      members: group.members,
      currentMemberId: userId ? group.memberIdsByUserId[userId] ?? null : null,
      movements: groupMovements,
      payments: groupPayments,
      obligations: groupObligations,
    };
  }), [groups, movements, payments, userId]);
  const groupOptions = groups.map(({ id, name }) => ({ id, name }));

  return {
    movements,
    isReady,
    loadError,
    addMovement,
    updateMovement,
    refresh,
    obligations,
    members,
    currentMemberIds,
    groupLedgers,
    payments,
    currentMemberId,
    groups: groupOptions,
    groupId,
    groupName,
    groupJoinCode,
    groupOwnerId,
    selectGroup,
  };
}
