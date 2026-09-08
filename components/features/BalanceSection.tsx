'use client';

import { ArrowUpRightIcon } from 'lucide-react';
import { type Member, type Settlement } from '@/lib/ledger';
import { Avatar } from '@/components/layout/Avatar';
import { formatARS } from '@/lib/utils';

interface BalanceSectionProps {
  members: Member[];
  balances: Record<string, number>;
  settlements: Settlement[];
}

export function BalanceSection({ members, balances, settlements }: BalanceSectionProps) {
  return (
    <section className="mt-8" aria-labelledby="balance-title">
      <h1 id="balance-title" className="text-3xl font-bold tracking-[-0.045em]">Balance del grupo</h1>
      <p className="mt-2 text-sm leading-6 text-[#5d5d5d]">Un solo saldo por persona, incluso cuando hubo préstamos entre dos integrantes.</p>

      <section className="mt-7 rounded-[30px] bg-[#f6f6f6] p-5" aria-labelledby="settlement-title">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-white text-[#594ff4] ring-1 ring-[#e7e7e7]">
            <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          </span>
          <div>
            <h2 id="settlement-title" className="font-bold tracking-[-0.02em]">Para saldar</h2>
            <p className="text-sm text-[#5d5d5d]">Menos transferencias, mismo resultado.</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {settlements.map((settlement) => {
            const from = members.find((m) => m.id === settlement.from) ?? members[0];
            const to = members.find((m) => m.id === settlement.to) ?? members[0];
            return (
              <div key={`${settlement.from}-${settlement.to}`} className="rounded-2xl bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar member={from} size="small" />
                    <ArrowUpRightIcon aria-hidden="true" width="16" height="16" className="shrink-0 text-[#888888]" />
                    <Avatar member={to} size="small" />
                    <p className="min-w-0 truncate text-sm font-bold">{from.name} paga a {to.name}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums">{formatARS(settlement.amount)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-7" aria-labelledby="members-title">
        <h2 id="members-title" className="text-xl font-bold tracking-[-0.035em]">Por persona</h2>
        <div className="mt-4 space-y-3">
          {members.map((member) => {
            const balance = balances[member.id];
            return (
              <div key={member.id} className="flex items-center justify-between rounded-2xl border border-[#e7e7e7] p-4">
                <div className="flex items-center gap-3">
                  <Avatar member={member} size="small" />
                  <div>
                    <p className="font-bold">{member.name}</p>
                    <p className="text-xs text-[#5d5d5d]">{balance >= 0 ? 'Tiene saldo a favor' : 'Tiene saldo pendiente'}</p>
                  </div>
                </div>
                <p className={`font-bold tabular-nums ${balance >= 0 ? 'text-[#1f1f1f]' : 'text-[#5d5d5d]'}`}>
                  {balance >= 0 ? '+' : '-'}{formatARS(balance)}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}
