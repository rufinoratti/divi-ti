'use client';

import { type LedgerMovement, type Member } from '@/lib/ledger';
import { MovementIcon } from '@/components/layout/MovementIcon';
import { formatARS } from '@/lib/utils';
import { ArrowDownLeft, ArrowUpRight, PencilSimple } from '@phosphor-icons/react';
import { Icon } from '@/components/ui/icon';

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
  const DirectionIcon = isPositive ? ArrowDownLeft : ArrowUpRight;

  return (
    <article className="movement-row flex items-center gap-3 px-4 py-3.5">
      <MovementIcon category={movement.category} />
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-line break-words text-sm font-bold leading-5 text-ink">{movement.description}</p>
        <p className="mt-1 truncate text-xs leading-4 text-copy-muted">
          {detail}{movement.groupName ? ` · ${movement.groupName}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold tabular-nums text-ink">{formatARS(movement.amount)}</p>
        <span className={`mt-1 inline-flex items-center justify-end gap-0.5 text-[0.68rem] font-bold tabular-nums ${isPositive ? 'text-success' : 'text-danger'}`}>
          <Icon icon={DirectionIcon} size="sm" aria-hidden="true" />
          {isPositive ? '+' : '−'}
        </span>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={() => onEdit(movement)}
          disabled={isLocked}
          title={isLocked ? 'No se puede editar un movimiento con pagos asociados.' : 'Editar movimiento'}
          aria-label={isLocked ? `No se puede editar ${movement.description}: tiene pagos asociados` : `Editar ${movement.description}`}
          className="grid size-10 shrink-0 place-items-center rounded-full text-brand transition duration-150 hover:bg-brand-soft active:scale-[0.96] disabled:cursor-not-allowed disabled:text-subtle"
        >
          <Icon icon={PencilSimple} size="md" aria-hidden="true" />
        </button>
      )}
    </article>
  );
}
