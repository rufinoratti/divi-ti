'use client';

import { type LedgerMovement, type Member } from '@/lib/ledger';
import { MovementIcon } from '@/components/layout/MovementIcon';
import { formatARS } from '@/lib/utils';
import { PencilIcon } from 'lucide-react';

interface MovementItemProps {
  movement: LedgerMovement;
  members: Member[];
  currentMemberId: string | null;
  currentMemberIds?: string[];
  onEdit?: (movement: LedgerMovement) => void;
  isLocked?: boolean;
}

export function MovementItem({ movement, members, currentMemberId, currentMemberIds, onEdit, isLocked = false }: MovementItemProps) {
  const payer = members.find((m) => m.id === movement.paidBy) ?? members[0];
  const recipient = movement.recipient ? members.find((m) => m.id === movement.recipient) : undefined;
  const isCurrentPayer = currentMemberIds
    ? currentMemberIds.includes(movement.paidBy)
    : movement.paidBy === currentMemberId;
  const isCurrentRecipient = currentMemberIds
    ? currentMemberIds.includes(movement.recipient ?? '')
    : movement.recipient === currentMemberId;
  const isPositive = isCurrentPayer && !isCurrentRecipient;
  const payerName = payer?.name ?? 'Integrante';
  const detail = movement.kind === 'loan'
    ? `${payerName} le prestó a ${recipient?.name ?? 'integrante'}`
    : `Pagó ${payerName} - dividido entre ${movement.participants.length}`;

  return (
    <article className="flex items-center gap-3 rounded-[24px] border border-[#e7e7e7] bg-white p-4">
      <MovementIcon category={movement.category} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="whitespace-pre-line text-sm font-bold">{movement.description}</p>
          <p className={`shrink-0 text-sm font-bold tabular-nums ${isPositive ? 'text-[#594ff4]' : 'text-[#1f1f1f]'}`}>
            {isPositive ? '+' : '-'}{formatARS(movement.amount)}
          </p>
        </div>
        <p className="mt-1 truncate text-xs text-[#5d5d5d]">
          {detail}{movement.groupName ? ` · ${movement.groupName}` : ''}
        </p>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={() => onEdit(movement)}
          disabled={isLocked}
          title={isLocked ? 'No se puede editar un movimiento con pagos asociados.' : 'Editar movimiento'}
          aria-label={isLocked ? `No se puede editar ${movement.description}: tiene pagos asociados` : `Editar ${movement.description}`}
          className="grid size-10 shrink-0 place-items-center rounded-full text-[#594ff4] transition hover:bg-[#f1f0ff] active:scale-[0.96] disabled:cursor-not-allowed disabled:text-[#aaaaaa]"
        >
          <PencilIcon aria-hidden="true" size={17} />
        </button>
      )}
    </article>
  );
}
