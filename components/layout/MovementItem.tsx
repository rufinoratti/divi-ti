'use client';

import { getMovementParticipantShare, type LedgerMovement, type Member } from '@/lib/ledger';
import { MovementIcon } from '@/components/layout/MovementIcon';
import { formatARS } from '@/lib/utils';
import { PencilIcon } from 'lucide-react';

interface MovementItemProps {
  movement: LedgerMovement;
  members: Member[];
  currentMemberId: string;
  onEdit?: (movement: LedgerMovement) => void;
}

export function MovementItem({ movement, members, currentMemberId, onEdit }: MovementItemProps) {
  const payer = members.find((m) => m.id === movement.paidBy) ?? members[0];
  const recipient = movement.recipient ? members.find((m) => m.id === movement.recipient) : undefined;
  const isCurrentPayer = movement.paidBy === currentMemberId;
  const isCurrentRecipient = movement.recipient === currentMemberId;
  const isCurrentParticipant = movement.kind === 'expense' && movement.participants.includes(currentMemberId);
  const individualShare = getMovementParticipantShare(movement, currentMemberId);
  const currentImpact = movement.kind === 'loan'
    ? (isCurrentPayer ? movement.amount : isCurrentRecipient ? -movement.amount : 0)
    : (isCurrentPayer ? movement.amount - individualShare : isCurrentParticipant ? -individualShare : 0);
  const isPositive = currentImpact > 0;
  const detail = movement.kind === 'loan' ? `${payer.name} le prestó a ${recipient?.name}` : `Pagó ${payer.name} - dividido entre ${movement.participants.length}`;

  return (
    <article className="flex items-center gap-3 rounded-[24px] border border-[#e7e7e7] bg-white p-4">
      <MovementIcon category={movement.category} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-sm font-bold">{movement.description}</p>
          <p className={`shrink-0 text-sm font-bold tabular-nums ${isPositive ? 'text-[#594ff4]' : 'text-[#1f1f1f]'}`}>
            {currentImpact > 0 ? '+' : currentImpact < 0 ? '-' : ''}{formatARS(currentImpact)}
          </p>
        </div>
        <p className="mt-1 truncate text-xs text-[#5d5d5d]">{detail}</p>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={() => onEdit(movement)}
          aria-label={`Editar ${movement.description}`}
          className="grid size-9 shrink-0 place-items-center rounded-full text-[#888888] transition hover:bg-[#f6f6f6] hover:text-[#594ff4] active:scale-[0.94]"
        >
          <PencilIcon aria-hidden="true" size={16} strokeWidth={1.8} />
        </button>
      )}
    </article>
  );
}
