'use client';

import { useState } from 'react';
import { ArrowUpRightIcon, CheckIcon, Clock3Icon } from 'lucide-react';

import { calculateSettlements, type Member, type Settlement, type SettlementPayment } from '@/lib/ledger';
import { Avatar } from '@/components/layout/Avatar';
import { formatARS } from '@/lib/utils';

interface BalanceSectionProps {
  members: Member[];
  balances: Record<string, number>;
  payments: SettlementPayment[];
  groupId: string;
  currentMemberId: string;
  onPaymentChanged: () => void;
}

function formatPaymentDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function BalanceSection({ members, balances, payments, groupId, currentMemberId, onPaymentChanged }: BalanceSectionProps) {
  const [submittingPair, setSubmittingPair] = useState<string | null>(null);
  const [error, setError] = useState('');
  const settlements = calculateSettlements(members, balances);
  const hasOwnSettlement = settlements.some((settlement) => settlement.from === currentMemberId);
  const hasPendingOwnPayment = payments.some((payment) => payment.from === currentMemberId && payment.status === 'pendiente');
  const hasUnmatchedDebt = (balances[currentMemberId] ?? 0) < -0.01 && !hasOwnSettlement && !hasPendingOwnPayment;

  async function reportPayment(settlement: Settlement) {
    const pairKey = `${settlement.from}:${settlement.to}`;
    setSubmittingPair(pairKey);
    setError('');

    try {
      const response = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          fromMemberId: settlement.from,
          toMemberId: settlement.to,
          amount: settlement.amount,
        }),
      });
      const data = await response.json() as { error?: { message?: string } | string };

      if (!response.ok) {
        const message = typeof data.error === 'string' ? data.error : data.error?.message;
        setError(message ?? 'No pudimos avisar que pagaste. Intentá de nuevo.');
        return;
      }

      onPaymentChanged();
    } catch {
      setError('No pudimos conectarnos con Divi. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setSubmittingPair(null);
    }
  }

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
        {error && <p role="alert" className="mt-4 rounded-2xl bg-[#fef4f4] p-3 text-sm font-medium text-[#b42318]">{error}</p>}
        {hasUnmatchedDebt && (
          <p role="status" className="mt-4 rounded-2xl bg-white p-4 text-sm leading-5 text-[#5d5d5d]">
            Tu saldo figura pendiente, pero no encontramos a quién asignar el pago. Actualizá la pantalla y revisá el balance del grupo.
          </p>
        )}
        <div className="mt-5 space-y-3">
          {settlements.length === 0 && (
            <p className="rounded-2xl bg-white p-4 text-sm text-[#5d5d5d]">El grupo está al día.</p>
          )}
          {settlements.map((settlement) => {
            const from = members.find((member) => member.id === settlement.from) ?? members[0];
            const to = members.find((member) => member.id === settlement.to) ?? members[0];
            const pairKey = `${settlement.from}:${settlement.to}`;
            const pendingPayment = payments.find((payment) => (
              payment.status === 'pendiente'
              && payment.from === settlement.from
              && payment.to === settlement.to
            ));
            const canReportPayment = settlement.from === currentMemberId && Boolean(to?.userId);

            return (
              <div key={pairKey} className="rounded-2xl bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar member={from} size="small" />
                    <ArrowUpRightIcon aria-hidden="true" width="16" height="16" className="shrink-0 text-[#888888]" />
                    <Avatar member={to} size="small" />
                    <p className="min-w-0 truncate text-sm font-bold">{from?.name ?? 'Integrante'} paga a {to?.name ?? 'integrante'}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums">{formatARS(settlement.amount)}</p>
                </div>

                {pendingPayment && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8a5a00]">
                    <Clock3Icon aria-hidden="true" size={14} />
                    Avisaste que pagaste; falta que {to?.name ?? 'la otra persona'} confirme.
                  </p>
                )}
                {canReportPayment && !pendingPayment && (
                  <button
                    type="button"
                    disabled={submittingPair === pairKey}
                    onClick={() => { void reportPayment(settlement); }}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#594ff4] px-4 text-sm font-bold text-[#594ff4] transition hover:bg-[#f1f0ff] disabled:cursor-wait disabled:opacity-50"
                  >
                    <CheckIcon aria-hidden="true" size={16} />
                    {submittingPair === pairKey ? 'Enviando aviso…' : 'Marcar como pagado'}
                  </button>
                )}
                {settlement.from === currentMemberId && !to?.userId && !pendingPayment && (
                  <p className="mt-3 text-xs leading-5 text-[#888888]">
                    La otra persona necesita vincular su cuenta para confirmar el pago.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {payments.length > 0 && (
        <section className="mt-7" aria-labelledby="payments-title">
          <h2 id="payments-title" className="text-xl font-bold tracking-[-0.035em]">Historial de pagos</h2>
          <div className="mt-4 space-y-3">
            {payments.map((payment) => {
              const from = members.find((member) => member.id === payment.from);
              const to = members.find((member) => member.id === payment.to);
              const resolver = members.find((member) => member.userId === payment.resolvedBy);
              const statusLabel = payment.status === 'confirmada'
                ? `Confirmado${resolver ? ` por ${resolver.name}` : ''}`
                : payment.status === 'rechazada'
                  ? `Rechazado${resolver ? ` por ${resolver.name}` : ''}`
                  : 'Pendiente de confirmación';

              return (
                <article key={payment.id} className="rounded-2xl border border-[#e7e7e7] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{from?.name ?? 'Integrante'} informó un pago a {to?.name ?? 'integrante'}</p>
                      <p className="mt-1 text-xs text-[#5d5d5d]">Informado el {formatPaymentDate(payment.createdAt)}</p>
                      {payment.resolvedAt && (
                        <p className="mt-1 text-xs text-[#5d5d5d]">Respondido el {formatPaymentDate(payment.resolvedAt)}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums">{formatARS(payment.amount)}</p>
                  </div>
                  <p className={`mt-3 text-xs font-bold ${payment.status === 'confirmada' ? 'text-[#247446]' : payment.status === 'rechazada' ? 'text-[#b42318]' : 'text-[#8a5a00]'}`}>
                    {statusLabel}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      )}

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
