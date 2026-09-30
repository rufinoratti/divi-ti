'use client';

import { ChevronRightIcon } from 'lucide-react';

import { type GroupLedger } from '@/lib/ledger';
import { formatARS } from '@/lib/utils';

interface AllGroupsBalanceSectionProps {
  groups: GroupLedger[];
  onOpenGroup: (groupId: string) => void;
}

export function AllGroupsBalanceSection({ groups, onOpenGroup }: AllGroupsBalanceSectionProps) {
  const totalOwed = groups.reduce((sum, group) => {
    const balance = group.currentMemberId ? group.balances[group.currentMemberId] ?? 0 : 0;
    return sum + Math.max(balance, 0);
  }, 0);
  const totalOwing = groups.reduce((sum, group) => {
    const balance = group.currentMemberId ? group.balances[group.currentMemberId] ?? 0 : 0;
    return sum + Math.max(-balance, 0);
  }, 0);

  return (
    <section className="mt-8" aria-labelledby="all-balances-title">
      <h1 id="all-balances-title" className="text-3xl font-bold tracking-[-0.045em]">Balance general</h1>
      <p className="mt-2 text-sm leading-6 text-[#5d5d5d]">Cada grupo conserva su propio saldo; no mezclamos deudas entre grupos.</p>

      <div className="mt-7 grid grid-cols-2 gap-3">
        <div className="rounded-[24px] bg-[#f6f6f6] p-4">
          <p className="text-xs font-medium text-[#5d5d5d]">Te deben</p>
          <p className="mt-2 text-xl font-bold tabular-nums">{formatARS(totalOwed)}</p>
        </div>
        <div className="rounded-[24px] bg-[#f6f6f6] p-4">
          <p className="text-xs font-medium text-[#5d5d5d]">Debés</p>
          <p className="mt-2 text-xl font-bold tabular-nums">{formatARS(totalOwing)}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {groups.map((group) => {
          const balance = group.currentMemberId ? group.balances[group.currentMemberId] ?? 0 : 0;
          const personalSettlements = group.settlements.filter((settlement) => (
            settlement.from === group.currentMemberId || settlement.to === group.currentMemberId
          ));
          const nextSettlement = personalSettlements[0];
          const counterpartyId = nextSettlement
            ? nextSettlement.from === group.currentMemberId ? nextSettlement.to : nextSettlement.from
            : null;
          const counterparty = group.members.find((member) => member.id === counterpartyId);

          return (
            <article key={group.id} className="rounded-[26px] border border-[#e7e7e7] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate font-bold">{group.name}</h2>
                  <p className="mt-1 text-sm text-[#5d5d5d]">
                    {balance < -0.01 ? 'Debés' : balance > 0.01 ? 'Te deben' : 'Al día'}
                  </p>
                </div>
                <p className={`shrink-0 text-sm font-bold tabular-nums ${balance < -0.01 ? 'text-[#b42318]' : balance > 0.01 ? 'text-[#247446]' : 'text-[#1f1f1f]'}`}>
                  {formatARS(Math.abs(balance))}
                </p>
              </div>
              {nextSettlement && (
                <p className="mt-3 text-xs leading-5 text-[#5d5d5d]">
                  {nextSettlement.from === group.currentMemberId ? 'Te toca pagar a' : 'Te paga'}{' '}
                  {counterparty?.name ?? 'un integrante'}: {formatARS(nextSettlement.amount)}
                </p>
              )}
              <button
                type="button"
                onClick={() => onOpenGroup(group.id)}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-between rounded-full border border-[#e7e7e7] px-4 text-sm font-bold transition hover:bg-[#f6f6f6]"
              >
                Ver balance del grupo
                <ChevronRightIcon aria-hidden="true" size={17} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
