'use client';

import { ArrowDownLeftIcon, ArrowUpRightIcon, CheckIcon, ChevronRightIcon, UsersRoundIcon } from 'lucide-react';

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
      <h1 id="all-balances-title" className="divi-page-title">Balance general</h1>
      <p className="mt-2 text-sm leading-6 text-copy-muted">Ves lo que debés y te deben en cada grupo, gasto por gasto.</p>

      <div className="mt-7 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-copy-muted">
            <ArrowDownLeftIcon aria-hidden="true" size={15} className="text-success" />
            Te deben
          </p>
          <p className="mt-2 min-w-0 break-words text-base font-bold tracking-[-0.04em] tabular-nums sm:text-xl">{formatARS(totalOwed)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-copy-muted">
            <ArrowUpRightIcon aria-hidden="true" size={15} className="text-danger" />
            Debés
          </p>
          <p className="mt-2 min-w-0 break-words text-base font-bold tracking-[-0.04em] tabular-nums sm:text-xl">{formatARS(totalOwing)}</p>
        </div>
      </div>

      <div className="app-list mt-6 divide-y divide-line">
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
            <article key={group.id} className="px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-[16px] bg-brand-soft text-brand">
                  <UsersRoundIcon aria-hidden="true" size={19} strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-bold">{group.name}</h2>
                  <p className="mt-0.5 text-xs text-copy-muted">{group.members.length} {group.members.length === 1 ? 'persona' : 'personas'}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {owes > 0 && <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-[#fff8f7] px-3 text-xs font-bold text-danger"><ArrowUpRightIcon aria-hidden="true" size={14} />Debés {formatARS(owes)}</span>}
                {owed > 0 && <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-[#edf8f0] px-3 text-xs font-bold text-success"><ArrowDownLeftIcon aria-hidden="true" size={14} />Te deben {formatARS(owed)}</span>}
                {owes <= 0 && owed <= 0 && <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-xs font-semibold text-copy-muted"><CheckIcon aria-hidden="true" size={14} />Al día</span>}
              </div>
              {nextOwedByMe && (
                <p className="mt-3 whitespace-pre-line text-xs leading-5 text-copy-muted">
                  Le debés a {fromMember?.name ?? 'un integrante'} {formatARS(nextOwedByMe.remainingAmount)} por {nextOwedByMe.description}
                </p>
              )}
              {!nextOwedByMe && nextOwedToMe && (
                <p className="mt-3 whitespace-pre-line text-xs leading-5 text-copy-muted">
                  {toMember?.name ?? 'Un integrante'} te debe {formatARS(nextOwedToMe.remainingAmount)} por {nextOwedToMe.description}
                </p>
              )}
              <button
                type="button"
                onClick={() => onOpenGroup(group.id)}
                className="mt-3 inline-flex min-h-10 w-full items-center justify-between rounded-xl bg-surface px-3 text-sm font-bold text-brand transition active:scale-[0.99]"
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
