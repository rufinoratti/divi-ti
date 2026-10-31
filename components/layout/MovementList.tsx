'use client';

import { type LedgerMovement, type Member } from '@/lib/ledger';
import { MovementItem } from '@/components/layout/MovementItem';
import { ReceiptTextIcon } from 'lucide-react';

interface MovementListProps {
  movements: LedgerMovement[];
  members: Member[];
  currentMemberId: string | null;
  currentMemberIds?: string[];
  emptyLabel?: string;
  onEdit?: (movement: LedgerMovement) => void;
  lockedMovementIds?: string[];
}

export function MovementList({
  movements,
  members,
  currentMemberId,
  currentMemberIds,
  emptyLabel = 'Todavía no hay movimientos.',
  onEdit,
  lockedMovementIds = [],
}: MovementListProps) {
  if (!movements.length) {
    return (
      <div className="divi-surface-muted flex flex-col items-center px-5 py-8 text-center">
        <span className="grid size-12 place-items-center rounded-2xl border border-line bg-white text-brand">
          <ReceiptTextIcon aria-hidden="true" size={21} strokeWidth={1.8} />
        </span>
        <p className="mt-4 text-sm font-bold text-ink">{emptyLabel}</p>
        <p className="mt-1 max-w-[18rem] text-sm leading-5 text-copy-muted">Agregá un gasto o préstamo para ver el balance.</p>
      </div>
    );
  }

  return (
    <div className="app-list divide-y divide-line">
      {movements.map((movement) => (
        <MovementItem key={movement.id} movement={movement} members={members} currentMemberId={currentMemberId} currentMemberIds={currentMemberIds} onEdit={onEdit} isLocked={lockedMovementIds.includes(movement.id)} />
      ))}
    </div>
  );
}
