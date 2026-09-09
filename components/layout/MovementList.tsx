'use client';

import { type LedgerMovement, type Member } from '@/lib/ledger';
import { MovementItem } from '@/components/layout/MovementItem';
import { ReceiptTextIcon } from 'lucide-react';

interface MovementListProps {
  movements: LedgerMovement[];
  members: Member[];
  currentMemberId: string;
  emptyLabel?: string;
  onEditMovement?: (movement: LedgerMovement) => void;
}

export function MovementList({
  movements,
  members,
  currentMemberId,
  emptyLabel = 'Todavía no hay movimientos.',
  onEditMovement,
}: MovementListProps) {
  if (!movements.length) {
    return (
      <div className="rounded-[28px] bg-[#f6f6f6] px-5 py-9 text-center">
        <ReceiptTextIcon aria-hidden="true" size={24} className="mx-auto text-[#594ff4]" />
        <p className="mt-3 text-sm font-bold">{emptyLabel}</p>
        <p className="mt-1 text-sm text-[#5d5d5d]">Agregá un gasto o préstamo para ver el balance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {movements.map((movement) => (
        <MovementItem key={movement.id} movement={movement} members={members} currentMemberId={currentMemberId} onEdit={onEditMovement} />
      ))}
    </div>
  );
}
