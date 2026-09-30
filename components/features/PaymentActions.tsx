'use client';

import { useState } from 'react';
import { CheckIcon, XIcon } from 'lucide-react';

import { roundCurrency, type GroupLedger, type MovementObligation, type SettlementPayment } from '@/lib/ledger';
import { formatARS } from '@/lib/utils';

interface PaymentConfirmationActionsProps {
  payment: SettlementPayment;
  obligation: MovementObligation;
  debtorName: string;
  onResolved: () => void;
}

export function PaymentConfirmationActions({
  payment,
  obligation,
  debtorName,
  onResolved,
}: PaymentConfirmationActionsProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const amountAfterConfirmation = roundCurrency(Math.max(0, obligation.remainingAmount - payment.amount));

  async function respond(action: 'confirm' | 'reject') {
    if (busy) return;
    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/settlements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlementId: payment.id, action }),
      });
      const data = await response.json() as { error?: { message?: string } | string };

      if (!response.ok) {
        const message = typeof data.error === 'string' ? data.error : data.error?.message;
        setError(message ?? 'No pudimos guardar tu respuesta. Intentá de nuevo.');
        return;
      }

      onResolved();
    } catch {
      setError('No pudimos conectarnos con Divi. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold leading-5 text-[#8a5a00]">
        {`${debtorName} avisó un pago de ${formatARS(payment.amount)}. ¿Lo recibiste?`}
      </p>
      <p className="mt-1 text-xs leading-5 text-[#5d5d5d]">
        {`Saldo actual de ${debtorName}: ${formatARS(obligation.remainingAmount)}.`}{' '}
        {amountAfterConfirmation > 0
          ? `Al confirmar, le quedarán ${formatARS(amountAfterConfirmation)} por pagar de este gasto.`
          : 'Al confirmar, queda saldada la deuda de este gasto.'}
        {' '}El saldo no cambia hasta que respondas.
      </p>
      {error && <p role="alert" className="mt-2 text-xs font-medium leading-5 text-[#b42318]">{error}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => { void respond('reject'); }}
          className="inline-flex min-h-10 items-center justify-center gap-1 rounded-full border border-[#e7e7e7] bg-white px-2 text-xs font-bold text-[#5d5d5d] transition hover:bg-[#f6f6f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#594ff4] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
        >
          <XIcon aria-hidden="true" size={14} />
          No lo recibí
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => { void respond('confirm'); }}
          className="inline-flex min-h-10 items-center justify-center gap-1 rounded-full bg-[#594ff4] px-2 text-xs font-bold text-white transition hover:bg-[#4c42e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#594ff4] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
        >
          <CheckIcon aria-hidden="true" size={14} />
          {busy ? 'Guardando…' : 'Sí, lo recibí'}
        </button>
      </div>
    </div>
  );
}

interface PendingPaymentsSectionProps {
  groups: GroupLedger[];
  onPaymentChanged: () => void;
  className?: string;
}

export function PendingPaymentsSection({ groups, onPaymentChanged, className = '' }: PendingPaymentsSectionProps) {
  const pendingItems = groups.flatMap((group) => {
    if (!group.currentMemberId) return [];

    return group.payments
      .filter((payment) => payment.status === 'pendiente' && payment.to === group.currentMemberId)
      .flatMap((payment) => {
        if (!payment.movementId) return [];
        const movement = group.movements.find((item) => item.id === payment.movementId);
        const obligation = group.obligations.find((item) => (
          item.movementId === payment.movementId
          && item.from === payment.from
          && item.to === payment.to
        ));
        if (!movement || !obligation) return [];
        const debtor = group.members.find((member) => member.id === payment.from);
        return [{ group, payment, movement, obligation, debtorName: debtor?.name ?? 'Un integrante' }];
      });
  });

  if (pendingItems.length === 0) return null;

  return (
    <section aria-labelledby="pending-payments-title" className={`space-y-3 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="pending-payments-title" className="text-xl font-bold tracking-[-0.035em]">Pagos para confirmar</h2>
        <span className="shrink-0 text-sm font-semibold text-[#8a5a00]">
          {pendingItems.length} {pendingItems.length === 1 ? 'aviso' : 'avisos'}
        </span>
      </div>

      {pendingItems.map(({ group, payment, movement, obligation, debtorName }) => (
        <article key={payment.id} className="rounded-[24px] border border-[#ead7a8] bg-[#fffaf0] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold">{movement.description}</h3>
              {groups.length > 1 && <p className="mt-1 text-xs text-[#5d5d5d]">{group.name}</p>}
            </div>
            <p className="shrink-0 text-base font-bold tabular-nums">{formatARS(payment.amount)}</p>
          </div>
          <PaymentConfirmationActions
            payment={payment}
            obligation={obligation}
            debtorName={debtorName}
            onResolved={onPaymentChanged}
          />
        </article>
      ))}
    </section>
  );
}
