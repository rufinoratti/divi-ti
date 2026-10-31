'use client';

import { ChevronRightIcon, UsersRoundIcon } from 'lucide-react';

import { CreateGroupDialog } from '@/components/features/CreateGroupDialog';
import { JoinGroupDialog } from '@/components/features/JoinGroupDialog';
import { PendingPaymentsSection } from '@/components/features/PaymentActions';
import { summarizeMemberObligations, type GroupLedger } from '@/lib/ledger';
import { formatARS } from '@/lib/utils';

interface AllGroupsHomeProps {
  groups: GroupLedger[];
  onOpenGroup: (groupId: string) => void;
  onPaymentChanged: () => void;
}

function groupBalanceLines(owes: number, owed: number) {
  const lines: Array<{ label: string; amount: string; className: string }> = [];
  if (owes > 0) lines.push({ label: 'Debés', amount: formatARS(owes), className: 'text-danger' });
  if (owed > 0) lines.push({ label: 'Te deben', amount: formatARS(owed), className: 'text-success' });
  return lines.length ? lines : [{ label: 'Al día', amount: formatARS(0), className: 'text-copy-muted' }];
}

export function AllGroupsHome({ groups, onOpenGroup, onPaymentChanged }: AllGroupsHomeProps) {
  return (
    <section className="mt-8" aria-labelledby="my-groups-title">
      <h1 id="my-groups-title" className="divi-page-title">Mis grupos</h1>
      <p className="mt-2 text-sm leading-6 text-copy-muted">Entrá a un grupo para ver sus gastos y saldos.</p>

      <PendingPaymentsSection className="mt-6" groups={groups} onPaymentChanged={onPaymentChanged} />

      <div className="app-list mt-7 divide-y divide-line">
        {groups.map((group) => {
          const memberObligations = group.currentMemberId
            ? summarizeMemberObligations(group.members, group.obligations)[group.currentMemberId]
            : null;
          const balanceLines = memberObligations
            ? groupBalanceLines(memberObligations.owes, memberObligations.owed)
            : [{ label: 'Sin vínculo', amount: '', className: 'text-copy-muted' }];

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onOpenGroup(group.id)}
              className="flex min-h-[5.5rem] w-full items-center gap-3 px-4 py-4 text-left transition active:bg-surface"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-[16px] bg-brand-soft text-brand">
                <UsersRoundIcon aria-hidden="true" size={20} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{group.name}</span>
                <span className="mt-1 block text-xs text-copy-muted">{group.members.length} {group.members.length === 1 ? 'persona' : 'personas'}</span>
              </span>
              <span className="shrink-0 space-y-1 text-right text-[0.68rem] font-bold tabular-nums">
                {balanceLines.map((line) => (
                  <span key={line.label} className={`block ${line.className}`}>
                    {line.label}{line.amount ? ` ${line.amount}` : ''}
                  </span>
                ))}
              </span>
              <ChevronRightIcon aria-hidden="true" size={18} className="shrink-0 text-subtle" />
            </button>
          );
        })}
      </div>

      <div className="mt-7 space-y-3">
        <CreateGroupDialog compact />
        <JoinGroupDialog compact />
      </div>
    </section>
  );
}
