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
  if (owes > 0) lines.push({ label: 'Debés', amount: formatARS(owes), className: 'text-[#b42318]' });
  if (owed > 0) lines.push({ label: 'Te deben', amount: formatARS(owed), className: 'text-[#247446]' });
  return lines.length ? lines : [{ label: 'Al día', amount: formatARS(0), className: 'text-[#5d5d5d]' }];
}

export function AllGroupsHome({ groups, onOpenGroup, onPaymentChanged }: AllGroupsHomeProps) {
  return (
    <section className="mt-8" aria-labelledby="my-groups-title">
      <h1 id="my-groups-title" className="text-3xl font-bold tracking-[-0.045em]">Mis grupos</h1>
      <p className="mt-2 text-sm leading-6 text-[#5d5d5d]">Entrá a un grupo para ver sus gastos y saldos.</p>

      <PendingPaymentsSection className="mt-6" groups={groups} onPaymentChanged={onPaymentChanged} />

      <div className="mt-7 space-y-3">
        {groups.map((group) => {
          const memberObligations = group.currentMemberId
            ? summarizeMemberObligations(group.members, group.obligations)[group.currentMemberId]
            : null;
          const balanceLines = memberObligations
            ? groupBalanceLines(memberObligations.owes, memberObligations.owed)
            : [{ label: 'Sin vínculo', amount: '', className: 'text-[#888888]' }];

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onOpenGroup(group.id)}
              className="flex min-h-[7.25rem] w-full items-center gap-4 rounded-[28px] border border-[#e7e7e7] bg-white p-5 text-left shadow-[0_8px_22px_rgba(31,31,31,0.035)] transition hover:border-[#d7d4ff] active:scale-[0.99]"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#f1f0ff] text-[#594ff4]">
                <UsersRoundIcon aria-hidden="true" size={22} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold">{group.name}</span>
                <span className="mt-1 block text-sm text-[#888888]">{group.members.length} personas</span>
              </span>
              <span className="shrink-0 space-y-1 text-right text-xs font-bold">
                {balanceLines.map((line) => (
                  <span key={line.label} className={`block ${line.className}`}>
                    {line.label}{line.amount ? ` ${line.amount}` : ''}
                  </span>
                ))}
              </span>
              <ChevronRightIcon aria-hidden="true" size={20} className="shrink-0 text-[#888888]" />
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
