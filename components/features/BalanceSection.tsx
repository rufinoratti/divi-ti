'use client';

import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle, Clock, Wallet, X } from '@phosphor-icons/react';

import { Avatar } from '@/components/layout/Avatar';
import { Icon } from '@/components/ui/icon';
import { PaymentConfirmationActions } from '@/components/features/PaymentActions';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { calculateNetMemberBalances, roundCurrency, suggestMinimumTransfers, toCurrencyCents, type LedgerMovement, type Member, type MovementObligation, type SettlementPayment, summarizeMemberObligations } from '@/lib/ledger';
import { formatARS } from '@/lib/utils';

interface BalanceSectionProps {
  members: Member[];
  movements: LedgerMovement[];
  obligations: MovementObligation[];
  payments: SettlementPayment[];
  groupId: string;
  currentMemberId: string;
  onPaymentChanged: () => void;
}

function formatPaymentDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function parsePaymentAmount(value: string) {
  const normalized = value.trim().replace(',', '.');
  return /^\d+(?:\.\d{1,2})?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

const INITIAL_PAYMENT_HISTORY_LIMIT = 4;

export function BalanceSection({ members, movements, obligations, payments, groupId, currentMemberId, onPaymentChanged }: BalanceSectionProps) {
  const [selectedObligationId, setSelectedObligationId] = useState('');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showAllPaymentHistory, setShowAllPaymentHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const currentObligations = obligations.filter((obligation) => (
    obligation.remainingAmount > 0
    && (obligation.from === currentMemberId || obligation.to === currentMemberId)
  ));
  const owing = currentObligations
    .filter((obligation) => obligation.from === currentMemberId)
    .reduce((sum, obligation) => sum + obligation.remainingAmount, 0);
  const owed = currentObligations
    .filter((obligation) => obligation.to === currentMemberId)
    .reduce((sum, obligation) => sum + obligation.remainingAmount, 0);
  const selectedObligation = currentObligations.find((obligation) => obligation.id === selectedObligationId);
  const parsedPaymentAmount = parsePaymentAmount(paymentAmount);
  const hasValidPaymentAmount = paymentAmount.trim() !== ''
    && Number.isFinite(parsedPaymentAmount)
    && parsedPaymentAmount > 0
    && Math.round(parsedPaymentAmount * 100) <= Math.round((selectedObligation?.availableAmount ?? 0) * 100);

  function openPaymentDialog(obligation: MovementObligation) {
    setSelectedObligationId(obligation.id);
    setPaymentAmount('');
    setError('');
    setPaymentDialogOpen(true);
  }

  async function reportPayment(amount: number) {
    if (
      !selectedObligation
      || !Number.isFinite(amount)
      || toCurrencyCents(amount) <= 0
      || toCurrencyCents(amount) > toCurrencyCents(selectedObligation.availableAmount)
    ) return;
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          movementId: selectedObligation.movementId,
          fromMemberId: selectedObligation.from,
          toMemberId: selectedObligation.to,
          amount: roundCurrency(amount),
        }),
      });
      const data = await response.json() as { error?: { message?: string } | string };

      if (!response.ok) {
        const message = typeof data.error === 'string' ? data.error : data.error?.message;
        setError(message ?? 'No pudimos avisar que pagaste. Intentá de nuevo.');
        return;
      }

      setPaymentDialogOpen(false);
      setPaymentAmount('');
      onPaymentChanged();
    } catch {
      setError('No pudimos conectarnos con Divi. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  const memberSummaries = summarizeMemberObligations(members, obligations);
  const netBalances = calculateNetMemberBalances(members, movements, payments);
  const settlementPlan = suggestMinimumTransfers(netBalances);
  const sortedPayments = [...payments].sort((left, right) => (
    Date.parse(right.createdAt) - Date.parse(left.createdAt)
    || right.id.localeCompare(left.id)
  ));
  const visiblePayments = showAllPaymentHistory
    ? sortedPayments
    : sortedPayments.slice(0, INITIAL_PAYMENT_HISTORY_LIMIT);

  return (
    <section className="mt-8" aria-labelledby="balance-title">
      <h1 id="balance-title" className="divi-page-title">Balance del grupo</h1>
      <p className="mt-2 text-sm leading-6 text-copy-muted">Cada deuda queda asociada al gasto que la generó.</p>

      <div className="mt-6 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-copy-muted">
            <Icon icon={ArrowUpRight} size="sm" className="text-danger" aria-hidden="true" />
            Debés
          </p>
          <p className="mt-2 min-w-0 break-words text-base font-bold tracking-[-0.04em] tabular-nums sm:text-xl">{formatARS(owing)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-copy-muted">
            <Icon icon={ArrowDownLeft} size="sm" className="text-success" aria-hidden="true" />
            Te deben
          </p>
          <p className="mt-2 min-w-0 break-words text-base font-bold tracking-[-0.04em] tabular-nums sm:text-xl">{formatARS(owed)}</p>
        </div>
      </div>

      <section className="mt-6 rounded-[var(--radius-panel)] border border-[#d7d4ff] bg-brand-wash p-5" aria-labelledby="net-balance-title">
        <h2 id="net-balance-title" className="divi-section-title">Saldo neto del grupo</h2>
        <p className="mt-1 text-xs leading-5 text-copy-muted">
          Propuesta orientativa; no cambia las deudas por gasto ni registra pagos.
        </p>
        <div className="mt-4 divide-y divide-[#e6e2ff]">
          {netBalances.map(({ memberId, amount }) => {
            const member = members.find((item) => item.id === memberId);
            return (
              <div key={memberId} className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm">
                <span className="font-semibold">{member?.name ?? 'Integrante'}</span>
                <span className={`font-bold tabular-nums ${amount > 0 ? 'text-success' : amount < 0 ? 'text-danger' : 'text-copy-muted'}`}>
                  {amount > 0 ? `A favor ${formatARS(amount)}` : amount < 0 ? `Debe ${formatARS(Math.abs(amount))}` : 'Al día'}
                </span>
              </div>
            );
          })}
        </div>
        <h3 className="mt-5 text-sm font-bold">Menos pagos posibles</h3>
        {!settlementPlan.supported && (
          <p className="mt-2 text-xs leading-5 text-copy-muted">
            {settlementPlan.reason === 'group_too_large'
              ? 'La sugerencia exacta está disponible para grupos de hasta 8 integrantes.'
              : 'No pudimos calcular la sugerencia con los saldos actuales. Revisá los movimientos del grupo.'}
          </p>
        )}
        {settlementPlan.supported && settlementPlan.transfers.length === 0 && (
          <p className="mt-2 text-xs leading-5 text-copy-muted">El grupo está al día.</p>
        )}
        {settlementPlan.transfers.length > 0 && (
          <ul className="mt-2 space-y-2">
            {settlementPlan.transfers.map((transfer, index) => (
              <li key={`${transfer.from}:${transfer.to}:${index}`} className="rounded-2xl bg-white px-3 py-2 text-sm">
                <span className="font-semibold">{members.find((member) => member.id === transfer.from)?.name ?? 'Integrante'}</span>
                {' paga '}
                <span className="font-semibold">{members.find((member) => member.id === transfer.to)?.name ?? 'integrante'}</span>
                {' '}
                <span className="font-bold tabular-nums">{formatARS(transfer.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-7 rounded-[var(--radius-panel)] bg-surface p-5" aria-labelledby="obligations-title">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-white text-brand ring-1 ring-line">
            <Icon icon={ArrowUpRight} size="md" aria-hidden="true" />
          </span>
          <div>
            <h2 id="obligations-title" className="divi-section-title">Deudas por gasto</h2>
            <p className="text-sm text-copy-muted">Pagá cada gasto a la persona que lo cubrió.</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {currentObligations.length === 0 && (
            <div className="flex items-center gap-3 rounded-2xl bg-white p-4">
              <Icon icon={CheckCircle} size="md" className="shrink-0 text-success" aria-hidden="true" />
              <p className="text-sm font-medium text-copy-muted">No tenés deudas pendientes en este grupo.</p>
            </div>
          )}

          {currentObligations.map((obligation) => {
            const debtor = members.find((member) => member.id === obligation.from);
            const creditor = members.find((member) => member.id === obligation.to);
            const movement = movements.find((item) => item.id === obligation.movementId);
            const participantCount = movement?.participants.length || members.length;
            const isOwing = obligation.from === currentMemberId;
            const pendingPayment = payments.find((payment) => (
              payment.movementId === obligation.movementId
              && payment.from === obligation.from
              && payment.to === obligation.to
              && payment.status === 'pendiente'
            ));
            const rejectedPayment = payments.some((payment) => (
              payment.movementId === obligation.movementId
              && payment.from === obligation.from
              && payment.to === obligation.to
              && payment.status === 'rechazada'
            ));
            const canPay = isOwing && obligation.availableAmount > 0 && !pendingPayment && Boolean(creditor?.userId);

            return (
              <article key={obligation.id} className="rounded-2xl bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="whitespace-pre-line text-sm font-bold">{obligation.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Avatar member={(isOwing ? creditor : debtor) ?? members[0]!} size="small" />
                      <p className="text-sm text-copy-muted">
                        {isOwing ? `Le pagás a ${creditor?.name ?? 'un integrante'}` : `${debtor?.name ?? 'Un integrante'} te debe`}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums">{formatARS(obligation.remainingAmount)}</p>
                    <p className="mt-1 text-[11px] text-copy-muted">{isOwing ? 'saldo por pagar' : 'saldo por cobrar'}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs leading-5 text-copy-muted">
                  {movement?.kind === 'expense' ? (
                    <p>Total del gasto: {formatARS(movement.amount)} · lo pagó {creditor?.name ?? 'un integrante'} · dividido entre {participantCount}</p>
                  ) : movement ? (
                    <p>Préstamo de {formatARS(movement.amount)} · lo hizo {creditor?.name ?? 'un integrante'}</p>
                  ) : null}
                  {movement?.kind === 'expense' && (
                    <p>{isOwing ? 'Tu parte original' : `Parte de ${debtor?.name ?? 'un integrante'}`}: {formatARS(obligation.amount)}</p>
                  )}
                  {movement?.kind === 'loan' && <p>Deuda original: {formatARS(obligation.amount)}</p>}
                  {obligation.confirmedAmount > 0 && (
                    <p>{isOwing ? 'Ya pagaste' : 'Ya recibiste'} y confirmaste: {formatARS(obligation.confirmedAmount)}</p>
                  )}
                </div>

                {pendingPayment && isOwing && (
                  <p className="mt-3 inline-flex items-start gap-1.5 text-xs font-semibold leading-5 text-warning">
                    <Icon icon={Clock} size="sm" className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      Avisaste {formatARS(pendingPayment.amount)} · falta que {creditor?.name ?? 'la otra persona'} confirme.
                      {' '}{`Si confirma, te quedarán ${formatARS(roundCurrency(Math.max(0, obligation.remainingAmount - pendingPayment.amount)))} por pagar.`}
                    </span>
                  </p>
                )}

                {pendingPayment && !isOwing && (
                  <PaymentConfirmationActions
                    payment={pendingPayment}
                    obligation={obligation}
                    debtorName={debtor?.name ?? 'La otra persona'}
                    onResolved={onPaymentChanged}
                  />
                )}

                {rejectedPayment && isOwing && !pendingPayment && obligation.availableAmount > 0 && (
                  <p role="status" className="mt-3 text-xs leading-5 text-warning">
                    El aviso anterior fue rechazado. La deuda sigue pendiente; podés informar un nuevo pago cuando lo hayas realizado.
                  </p>
                )}

                {canPay && (
                  <button
                    type="button"
                    onClick={() => openPaymentDialog(obligation)}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-brand px-4 text-sm font-bold text-brand transition hover:bg-brand-soft"
                  >
                    <Icon icon={Wallet} size="sm" aria-hidden="true" />
                    Pagar {obligation.description}
                  </button>
                )}

                {isOwing && !creditor?.userId && !pendingPayment && (
                  <p className="mt-3 text-xs leading-5 text-copy-muted">
                    {creditor?.name ?? 'La otra persona'} necesita vincular su cuenta para confirmar el pago.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <Dialog
        open={paymentDialogOpen}
        onOpenChange={(nextOpen) => {
          if (submitting) return;
          setPaymentDialogOpen(nextOpen);
          if (!nextOpen) setError('');
        }}
      >
        <DialogContent showCloseButton={false} className="max-h-[85dvh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-[var(--radius-panel)] bg-white p-6 sm:max-w-md">
          <DialogClose
            aria-label="Cerrar"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-surface text-ink"
          >
            <Icon icon={X} size="md" aria-hidden="true" />
            <span className="sr-only">Cerrar</span>
          </DialogClose>
          <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-[-0.035em]">Avisar un pago</DialogTitle>
            <DialogDescription className="mt-2 whitespace-pre-line leading-6 text-copy-muted">
              {selectedObligation && `Por ${selectedObligation.description} a ${members.find((member) => member.id === selectedObligation.to)?.name ?? 'un integrante'}. Divi no transfiere plata: avisamos el importe y la otra persona confirma cuando lo recibe.`}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            {selectedObligation && selectedObligation.availableAmount > 0 && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => { void reportPayment(selectedObligation.availableAmount); }}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-white transition hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
              >
                <Icon icon={Wallet} size="md" aria-hidden="true" />
                {submitting ? 'Enviando aviso…' : `Pagar todo y avisar ${formatARS(selectedObligation.availableAmount)}`}
              </button>
            )}

            <p className="text-center text-xs font-semibold text-copy-muted">O avisá un pago parcial</p>

            <label className="block space-y-2">
              <span className="text-sm font-bold">¿Cuánto vas a pagar?</span>
              <span className="relative block">
                <span aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-copy-muted">$</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  placeholder="0"
                  className="min-h-12 w-full rounded-2xl border border-[#dedede] bg-white pl-9 pr-4 text-base tabular-nums outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                />
              </span>
              {selectedObligation && (
                <span className="block text-xs leading-5 text-copy-muted">
                  Podés informar hasta {formatARS(selectedObligation.availableAmount)}. La deuda se descuenta cuando confirmen el pago.
                </span>
              )}
            </label>

            {error && <p role="alert" className="rounded-2xl bg-[#fef4f4] p-3 text-sm font-medium text-danger">{error}</p>}
            {paymentAmount !== '' && !hasValidPaymentAmount && (
              <p role="alert" className="text-sm font-medium text-danger">
                Ingresá un monto mayor a cero y hasta el saldo disponible de este gasto.
              </p>
            )}
            <button
              type="button"
              disabled={!hasValidPaymentAmount || submitting}
              onClick={() => { void reportPayment(parsedPaymentAmount); }}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-brand bg-white px-5 text-sm font-bold text-brand transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon icon={Wallet} size="md" aria-hidden="true" />
              {submitting ? 'Enviando aviso…' : 'Avisar este importe'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {payments.length > 0 && (
        <section className="mt-7" aria-labelledby="payments-title">
          <h2 id="payments-title" className="divi-section-title">Historial de pagos</h2>
          <div id="payment-history-list" className="mt-4 space-y-3">
            {visiblePayments.map((payment) => {
              const from = members.find((member) => member.id === payment.from);
              const to = members.find((member) => member.id === payment.to);
              const movementName = movements.find((movement) => movement.id === payment.movementId)?.description;
              const resolver = members.find((member) => member.userId === payment.resolvedBy);
              const statusLabel = payment.status === 'confirmada'
                ? `Confirmado${resolver ? ` por ${resolver.name}` : ''}`
                : payment.status === 'rechazada'
                  ? `Rechazado${resolver ? ` por ${resolver.name}` : ''}`
                  : 'Pendiente de confirmación';

              return (
                <article key={payment.id} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{from?.name ?? 'Integrante'} informó un pago a {to?.name ?? 'integrante'}{movementName ? ` por ${movementName}` : ''}</p>
                      <p className="mt-1 text-xs text-copy-muted">Informado el {formatPaymentDate(payment.createdAt)}</p>
                      {payment.resolvedAt && (
                        <p className="mt-1 text-xs text-copy-muted">Respondido el {formatPaymentDate(payment.resolvedAt)}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums">{formatARS(payment.amount)}</p>
                  </div>
                  <p className={`mt-3 text-xs font-bold ${payment.status === 'confirmada' ? 'text-success' : payment.status === 'rechazada' ? 'text-danger' : 'text-warning'}`}>
                    {statusLabel}
                  </p>
                </article>
              );
            })}
          </div>
          {sortedPayments.length > INITIAL_PAYMENT_HISTORY_LIMIT && (
            <button
              type="button"
              aria-expanded={showAllPaymentHistory}
              aria-controls="payment-history-list"
              onClick={() => setShowAllPaymentHistory((showAll) => !showAll)}
              className="mt-4 min-h-11 w-full rounded-full border border-line px-4 text-sm font-bold text-brand transition hover:bg-surface"
            >
              {showAllPaymentHistory ? 'Mostrar menos' : 'Mostrar más'}
            </button>
          )}
        </section>
      )}

      <section className="mt-7" aria-labelledby="members-title">
        <h2 id="members-title" className="divi-section-title">Por persona</h2>
        <div className="mt-4 space-y-3">
          {members.map((member) => {
            const summary = memberSummaries[member.id];
            return (
              <div key={member.id} className="flex items-center justify-between rounded-2xl border border-line p-4">
                <div className="flex items-center gap-3">
                  <Avatar member={member} size="small" />
                  <div>
                    <p className="font-bold">{member.name}</p>
                    <p className="text-xs text-copy-muted">
                      Debe {formatARS(summary.owes)} · le deben {formatARS(summary.owed)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}
