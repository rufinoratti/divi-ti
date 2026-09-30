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
    if (!group.currentMemberId) return sum;
    return sum + group.obligations
      .filter((obligation) => obligation.to === group.currentMemberId)
      .reduce((subtotal, obligation) => subtotal + obligation.remainingAmount, 0);
  }, 0);
  const totalOwing = groups.reduce((sum, group) => {
    if (!group.currentMemberId) return sum;
    return sum + group.obligations
      .filter((obligation) => obligation.from === group.currentMemberId)
      .reduce((subtotal, obligation) => subtotal + obligation.remainingAmount, 0);
  }, 0);

  return (
    <section className="mt-8" aria-labelledby="all-balances-title">
      <h1 id="all-balances-title" className="text-3xl font-bold tracking-[-0.045em]">Balance general</h1>
      <p className="mt-2 text-sm leading-6 text-[#5d5d5d]">Ves lo que debés y te deben en cada grupo, gasto por gasto.</p>

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
          const owes = group.currentMemberId
            ? group.obligations
              .filter((obligation) => obligation.from === group.currentMemberId)
              .reduce((sum, obligation) => sum + obligation.remainingAmount, 0)
            : 0;
          const owed = group.currentMemberId
            ? group.obligations
              .filter((obligation) => obligation.to === group.currentMemberId)
              .reduce((sum, obligation) => sum + obligation.remainingAmount, 0)
            : 0;
          const nextOwedByMe = group.obligations.find((obligation) => (
            obligation.from === group.currentMemberId && obligation.remainingAmount > 0
          ));
          const nextOwedToMe = group.obligations.find((obligation) => (
            obligation.to === group.currentMemberId && obligation.remainingAmount > 0
          ));
          const fromMember = group.members.find((member) => member.id === nextOwedByMe?.to);
          const toMember = group.members.find((member) => member.id === nextOwedToMe?.from);

          return (
            <article key={group.id} className="rounded-[26px] border border-[#e7e7e7] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate font-bold">{group.name}</h2>
                  <p className="mt-1 text-sm text-[#5d5d5d]">
                    {owes <= 0 && owed <= 0
                      ? 'Al día'
                      : [owes > 0 ? `Debés ${formatARS(owes)}` : '', owed > 0 ? `Te deben ${formatARS(owed)}` : ''].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              {nextOwedByMe && (
                <p className="mt-3 text-xs leading-5 text-[#5d5d5d]">
                  Le debés a {fromMember?.name ?? 'un integrante'} {formatARS(nextOwedByMe.remainingAmount)} por {nextOwedByMe.description}
                </p>
              )}
              {!nextOwedByMe && nextOwedToMe && (
                <p className="mt-3 text-xs leading-5 text-[#5d5d5d]">
                  {toMember?.name ?? 'Un integrante'} te debe {formatARS(nextOwedToMe.remainingAmount)} por {nextOwedToMe.description}
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
