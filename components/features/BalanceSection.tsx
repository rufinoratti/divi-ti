'use client';

import { useState } from 'react';
import { ArrowUpRightIcon, Clock3Icon, WalletIcon, XIcon } from 'lucide-react';

import { Avatar } from '@/components/layout/Avatar';
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

export function BalanceSection({ members, movements, obligations, payments, groupId, currentMemberId, onPaymentChanged }: BalanceSectionProps) {
  const [selectedObligationId, setSelectedObligationId] = useState('');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
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

  return (
    <section className="mt-8" aria-labelledby="balance-title">
      <h1 id="balance-title" className="text-3xl font-bold tracking-[-0.045em]">Balance del grupo</h1>
      <p className="mt-2 text-sm leading-6 text-[#5d5d5d]">Cada deuda queda asociada al gasto que la generó.</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-[24px] bg-[#f6f6f6] p-4">
          <p className="text-xs font-medium text-[#5d5d5d]">Debés</p>
          <p className="mt-2 text-xl font-bold tabular-nums">{formatARS(owing)}</p>
        </div>
        <div className="rounded-[24px] bg-[#f6f6f6] p-4">
          <p className="text-xs font-medium text-[#5d5d5d]">Te deben</p>
          <p className="mt-2 text-xl font-bold tabular-nums">{formatARS(owed)}</p>
        </div>
      </div>

      <section className="mt-6 rounded-[28px] border border-[#d7d4ff] bg-[#f7f6ff] p-5" aria-labelledby="net-balance-title">
        <h2 id="net-balance-title" className="font-bold tracking-[-0.02em]">Saldo neto del grupo</h2>
        <p className="mt-1 text-xs leading-5 text-[#5d5d5d]">
          Propuesta orientativa; no cambia las deudas por gasto ni registra pagos.
        </p>
        <div className="mt-4 space-y-2">
          {netBalances.map(({ memberId, amount }) => {
            const member = members.find((item) => item.id === memberId);
            return (
              <div key={memberId} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">{member?.name ?? 'Integrante'}</span>
                <span className={`font-bold tabular-nums ${amount > 0 ? 'text-[#247446]' : amount < 0 ? 'text-[#b42318]' : 'text-[#5d5d5d]'}`}>
                  {amount > 0 ? `A favor ${formatARS(amount)}` : amount < 0 ? `Debe ${formatARS(Math.abs(amount))}` : 'Al día'}
                </span>
              </div>
            );
          })}
        </div>
        <h3 className="mt-5 text-sm font-bold">Menos pagos posibles</h3>
        {!settlementPlan.supported && (
          <p className="mt-2 text-xs leading-5 text-[#5d5d5d]">
            {settlementPlan.reason === 'group_too_large'
              ? 'La sugerencia exacta está disponible para grupos de hasta 8 integrantes.'
              : 'No pudimos calcular la sugerencia con los saldos actuales. Revisá los movimientos del grupo.'}
          </p>
        )}
        {settlementPlan.supported && settlementPlan.transfers.length === 0 && (
          <p className="mt-2 text-xs leading-5 text-[#5d5d5d]">El grupo está al día.</p>
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

      <section className="mt-7 rounded-[30px] bg-[#f6f6f6] p-5" aria-labelledby="obligations-title">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-white text-[#594ff4] ring-1 ring-[#e7e7e7]">
            <ArrowUpRightIcon aria-hidden="true" size={20} />
          </span>
          <div>
            <h2 id="obligations-title" className="font-bold tracking-[-0.02em]">Deudas por gasto</h2>
            <p className="text-sm text-[#5d5d5d]">Pagá cada gasto a la persona que lo cubrió.</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {currentObligations.length === 0 && (
            <p className="rounded-2xl bg-white p-4 text-sm text-[#5d5d5d]">No tenés deudas pendientes en este grupo.</p>
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
            const canPay = isOwing && obligation.availableAmount > 0 && !pendingPayment && Boolean(creditor?.userId);

            return (
              <article key={obligation.id} className="rounded-2xl bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{obligation.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Avatar member={(isOwing ? creditor : debtor) ?? members[0]!} size="small" />
                      <p className="text-sm text-[#5d5d5d]">
                        {isOwing ? `Le pagás a ${creditor?.name ?? 'un integrante'}` : `${debtor?.name ?? 'Un integrante'} te debe`}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums">{formatARS(obligation.remainingAmount)}</p>
                    <p className="mt-1 text-[11px] text-[#777777]">{isOwing ? 'saldo por pagar' : 'saldo por cobrar'}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs leading-5 text-[#5d5d5d]">
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
                  <p className="mt-3 inline-flex items-start gap-1.5 text-xs font-semibold leading-5 text-[#8a5a00]">
                    <Clock3Icon aria-hidden="true" className="mt-0.5 shrink-0" size={14} />
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

                {canPay && (
                  <button
                    type="button"
                    onClick={() => openPaymentDialog(obligation)}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#594ff4] px-4 text-sm font-bold text-[#594ff4] transition hover:bg-[#f1f0ff]"
                  >
                    <WalletIcon aria-hidden="true" size={16} />
                    Pagar {obligation.description}
                  </button>
                )}

                {isOwing && !creditor?.userId && !pendingPayment && (
                  <p className="mt-3 text-xs leading-5 text-[#888888]">
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
        <DialogContent showCloseButton={false} className="max-h-[85dvh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-[28px] bg-white p-6 sm:max-w-md">
          <DialogClose
            aria-label="Cerrar"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-[#f6f6f6] text-[#1f1f1f]"
          >
            <XIcon aria-hidden="true" size={18} />
            <span className="sr-only">Cerrar</span>
          </DialogClose>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-[-0.04em]">Avisar un pago</DialogTitle>
            <DialogDescription className="mt-2 leading-6 text-[#5d5d5d]">
              {selectedObligation && `Por ${selectedObligation.description} a ${members.find((member) => member.id === selectedObligation.to)?.name ?? 'un integrante'}. Divi no transfiere plata: avisamos el importe y la otra persona confirma cuando lo recibe.`}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            {selectedObligation && selectedObligation.availableAmount > 0 && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => { void reportPayment(selectedObligation.availableAmount); }}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#594ff4] px-5 text-sm font-bold text-white transition hover:bg-[#4c42e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#594ff4] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
              >
                <WalletIcon aria-hidden="true" size={17} />
                {submitting ? 'Enviando aviso…' : `Pagar todo y avisar ${formatARS(selectedObligation.availableAmount)}`}
              </button>
            )}

            <p className="text-center text-xs font-semibold text-[#777777]">O avisá un pago parcial</p>

            <label className="block space-y-2">
              <span className="text-sm font-bold">¿Cuánto vas a pagar?</span>
              <span className="relative block">
                <span aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5d5d5d]">$</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  placeholder="0"
                  className="min-h-12 w-full rounded-2xl border border-[#dedede] bg-white pl-9 pr-4 text-base tabular-nums outline-none transition focus:border-[#594ff4] focus:ring-2 focus:ring-[#594ff4]/15"
                />
              </span>
              {selectedObligation && (
                <span className="block text-xs leading-5 text-[#777777]">
                  Podés informar hasta {formatARS(selectedObligation.availableAmount)}. La deuda se descuenta cuando confirmen el pago.
                </span>
              )}
            </label>

            {error && <p role="alert" className="rounded-2xl bg-[#fef4f4] p-3 text-sm font-medium text-[#b42318]">{error}</p>}
            {paymentAmount !== '' && !hasValidPaymentAmount && (
              <p role="alert" className="text-sm font-medium text-[#b42318]">
                Ingresá un monto mayor a cero y hasta el saldo disponible de este gasto.
              </p>
            )}
            <button
              type="button"
              disabled={!hasValidPaymentAmount || submitting}
              onClick={() => { void reportPayment(parsedPaymentAmount); }}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#594ff4] bg-white px-5 text-sm font-bold text-[#594ff4] transition hover:bg-[#f1f0ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#594ff4] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <WalletIcon aria-hidden="true" size={17} />
              {submitting ? 'Enviando aviso…' : 'Avisar este importe'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {payments.length > 0 && (
        <section className="mt-7" aria-labelledby="payments-title">
          <h2 id="payments-title" className="text-xl font-bold tracking-[-0.035em]">Historial de pagos</h2>
          <div className="mt-4 space-y-3">
            {payments.map((payment) => {
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
                <article key={payment.id} className="rounded-2xl border border-[#e7e7e7] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{from?.name ?? 'Integrante'} informó un pago a {to?.name ?? 'integrante'}{movementName ? ` por ${movementName}` : ''}</p>
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
            const summary = memberSummaries[member.id];
            return (
              <div key={member.id} className="flex items-center justify-between rounded-2xl border border-[#e7e7e7] p-4">
                <div className="flex items-center gap-3">
                  <Avatar member={member} size="small" />
                  <div>
                    <p className="font-bold">{member.name}</p>
                    <p className="text-xs text-[#5d5d5d]">
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
