'use client';

import { CheckIcon, ChevronRightIcon, CircleDollarSignIcon, HandCoinsIcon, ReceiptTextIcon, UsersRoundIcon } from 'lucide-react';

import { CreateGroupDialog } from '@/components/features/CreateGroupDialog';
import { JoinGroupDialog } from '@/components/features/JoinGroupDialog';
import { formatARS } from '@/lib/utils';

interface GroupOverviewProps {
  groups: Array<{ id: string; name: string; balance: number; memberCount: number }>;
  onSelectGroup: (groupId: string) => void;
}

export function GroupOverview({ groups, onSelectGroup }: GroupOverviewProps) {
  return (
    <section className="mt-8" aria-labelledby="groups-overview-title">
      <div className="flex items-center gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#594ff4] text-white">
          <ReceiptTextIcon aria-hidden="true" size={22} strokeWidth={1.9} />
        </span>
        <div>
          <h1 id="groups-overview-title" className="text-3xl font-bold tracking-[-0.035em]">Mis grupos</h1>
          <p className="mt-1 text-sm leading-5 text-[#5d5d5d]">Elegí una juntada para ver los gastos y saldos.</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {groups.map((group) => {
          const isOwed = group.balance > 0.01;
          const owes = group.balance < -0.01;
          const balanceLabel = isOwed ? 'Te deben' : owes ? 'Debés' : 'Al día';
          const balanceColor = isOwed ? 'text-[#176b57]' : owes ? 'text-[#a63f30]' : 'text-[#5144d8]';
          const balanceBadge = isOwed ? 'bg-[#e5f7f0]' : owes ? 'bg-[#fff0eb]' : 'bg-[#efedff]';
          const BalanceIcon = isOwed ? HandCoinsIcon : owes ? CircleDollarSignIcon : CheckIcon;

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelectGroup(group.id)}
              aria-label={`${group.name}. ${balanceLabel} ${formatARS(group.balance)}. Ver grupo.`}
              className="grid min-h-[5.75rem] w-full grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-2xl border border-[#e5e1f8] bg-white px-4 py-3 text-left transition hover:border-[#aaa0ff] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#594ff4]"
            >
              <span className="row-span-2 grid size-11 place-items-center rounded-xl bg-[#efedff] text-[#594ff4]">
                <UsersRoundIcon aria-hidden="true" size={20} strokeWidth={1.9} />
              </span>
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate text-base font-bold tracking-[-0.02em] text-[#1f1f1f]">{group.name}</span>
                <ChevronRightIcon aria-hidden="true" size={17} className="shrink-0 text-[#888888]" />
              </span>
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="shrink-0 text-xs text-[#686477]">
                  {group.memberCount} {group.memberCount === 1 ? 'persona' : 'personas'}
                </span>
                <span className="shrink-0 text-right">
                  <span className={`inline-flex items-center justify-end gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${balanceColor} ${balanceBadge}`}>
                    <BalanceIcon aria-hidden="true" size={13} />
                    {balanceLabel}
                  </span>
                  <span className={`mt-1.5 block text-sm font-bold tabular-nums ${balanceColor}`}>
                    {formatARS(group.balance)}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <CreateGroupDialog compact compactLabel="Crear grupo" compactVariant="primary" />
        <JoinGroupDialog compact compactLabel="Unirme" compactVariant="soft" />
      </div>
    </section>
  );
}
