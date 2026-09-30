export type Member = {
  id: string;
  name: string;
  initials: string;
  userId?: string | null;
};

export type MovementKind = 'expense' | 'loan';

export type MovementCategory =
  | 'Alquiler'
  | 'Comida'
  | 'Transporte'
  | 'Compras'
  | 'Otros'
  | 'Préstamo';

export type LedgerMovement = {
  id: string;
  kind: MovementKind;
  description: string;
  amount: number;
  paidBy: string;
  recipient?: string;
  category: MovementCategory;
  participants: string[];
  participantShares?: Record<string, number>;
  createdAt: string;
  groupId?: string;
  groupName?: string;
};

export type SettlementPaymentStatus = 'pendiente' | 'confirmada' | 'rechazada';

export type SettlementPayment = {
  id: string;
  groupId: string;
  movementId: string | null;
  from: string;
  to: string;
  amount: number;
  status: SettlementPaymentStatus;
  reportedBy: string;
  createdAt: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
};

export type PaymentNotification = {
  id: string;
  type: 'pago_informado' | 'pago_confirmado' | 'pago_rechazado';
  createdAt: string;
  readAt: string | null;
  payment: {
    id: string;
    groupId: string;
    groupName: string;
    movementId: string | null;
    movementDescription: string | null;
    fromMemberId: string;
    fromMemberName: string;
    toMemberId: string;
    toMemberName: string;
    amount: number;
    status: SettlementPaymentStatus;
  };
};

export type MovementObligation = {
  id: string;
  movementId: string;
  description: string;
  createdAt: string;
  from: string;
  to: string;
  amount: number;
  confirmedAmount: number;
  pendingAmount: number;
  remainingAmount: number;
  availableAmount: number;
};

export type GroupLedger = {
  id: string;
  name: string;
  members: Member[];
  currentMemberId: string | null;
  movements: LedgerMovement[];
  payments: SettlementPayment[];
  obligations: MovementObligation[];
};

export function toCurrencyCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100);
}

export function roundCurrency(value: number) {
  return toCurrencyCents(value) / 100;
}

export function splitAmountEqually(amount: number, participantCount: number) {
  if (!Number.isFinite(amount) || participantCount <= 0) return [];

  const totalCents = Math.abs(toCurrencyCents(amount));
  const baseCents = Math.floor(totalCents / participantCount);
  const remainder = totalCents % participantCount;
  const sign = Math.sign(amount);

  return Array.from({ length: participantCount }, (_, index) => (
    sign * (baseCents + (index < remainder ? 1 : 0)) / 100
  ));
}

export function calculateMovementObligations(
  members: Member[],
  movements: LedgerMovement[],
  payments: SettlementPayment[] = [],
): MovementObligation[] {
  const paymentTotals = new Map<string, { confirmedCents: number; pendingCents: number }>();
  for (const payment of payments) {
    if (!payment.movementId || payment.status === 'rechazada') continue;
    const key = `${payment.movementId}:${payment.from}:${payment.to}`;
    const totals = paymentTotals.get(key) ?? { confirmedCents: 0, pendingCents: 0 };
    if (payment.status === 'confirmada') totals.confirmedCents += toCurrencyCents(payment.amount);
    if (payment.status === 'pendiente') totals.pendingCents += toCurrencyCents(payment.amount);
    paymentTotals.set(key, totals);
  }

  const obligations: MovementObligation[] = [];
  for (const movement of movements) {
    const baseDebts: Array<{ from: string; to: string; amount: number }> = [];
    if (movement.kind === 'loan' && movement.recipient) {
      baseDebts.push({ from: movement.recipient, to: movement.paidBy, amount: roundCurrency(movement.amount) });
    } else {
      const participants = movement.participants.length ? movement.participants : members.map((member) => member.id);
      const storedShares = movement.participantShares;
      const equalShares = splitAmountEqually(movement.amount, participants.length);
      const shares = storedShares && Object.keys(storedShares).length > 0
        ? Object.fromEntries(participants.map((participant) => [participant, roundCurrency(storedShares[participant] ?? 0)]))
        : Object.fromEntries(participants.map((participant, index) => [participant, equalShares[index] ?? 0]));

      for (const participantId of participants) {
        const share = shares[participantId] ?? 0;
        if (participantId !== movement.paidBy && share > 0) {
          baseDebts.push({ from: participantId, to: movement.paidBy, amount: share });
        }
      }
    }

    for (const debt of baseDebts) {
      const id = `${movement.id}:${debt.from}:${debt.to}`;
      const totals = paymentTotals.get(id) ?? { confirmedCents: 0, pendingCents: 0 };
      const amountCents = toCurrencyCents(debt.amount);
      const remainingCents = Math.max(0, amountCents - totals.confirmedCents);
      const availableCents = Math.max(0, remainingCents - totals.pendingCents);
      obligations.push({
        id,
        movementId: movement.id,
        description: movement.description,
        createdAt: movement.createdAt,
        from: debt.from,
        to: debt.to,
        amount: debt.amount,
        confirmedAmount: totals.confirmedCents / 100,
        pendingAmount: Math.min(remainingCents, totals.pendingCents) / 100,
        remainingAmount: remainingCents / 100,
        availableAmount: availableCents / 100,
      });
    }
  }

  return obligations;
}

export function summarizeMemberObligations(members: Member[], obligations: MovementObligation[]) {
  return Object.fromEntries(members.map((member) => {
    const owes = obligations
      .filter((obligation) => obligation.from === member.id)
      .reduce((sum, obligation) => sum + obligation.remainingAmount, 0);
    const owed = obligations
      .filter((obligation) => obligation.to === member.id)
      .reduce((sum, obligation) => sum + obligation.remainingAmount, 0);
    return [member.id, { owes: roundCurrency(owes), owed: roundCurrency(owed) }];
  })) as Record<string, { owes: number; owed: number }>;
}
