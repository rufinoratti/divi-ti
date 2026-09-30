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

export type Settlement = {
  from: string;
  to: string;
  amount: number;
};

export type SettlementPaymentStatus = 'pendiente' | 'confirmada' | 'rechazada';

export type SettlementPayment = {
  id: string;
  groupId: string;
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
    fromMemberId: string;
    fromMemberName: string;
    toMemberId: string;
    toMemberName: string;
    amount: number;
    status: SettlementPaymentStatus;
  };
};

export type GroupLedger = {
  id: string;
  name: string;
  members: Member[];
  currentMemberId: string | null;
  movements: LedgerMovement[];
  payments: SettlementPayment[];
  balances: Record<string, number>;
  settlements: Settlement[];
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

export function calculateBalances(
  members: Member[],
  movements: LedgerMovement[],
  payments: SettlementPayment[] = [],
) {
  const balances = Object.fromEntries(
    members.map((member) => [member.id, 0]),
  ) as Record<string, number>;

  for (const movement of movements) {
    if (movement.kind === 'loan' && movement.recipient) {
      const amount = roundCurrency(movement.amount);
      balances[movement.paidBy] += amount;
      balances[movement.recipient] -= amount;
      continue;
    }

    const participants = movement.participants.length
      ? movement.participants
      : members.map((member) => member.id);
    const amount = roundCurrency(movement.amount);
    const storedShares = movement.participantShares;
    const shares = storedShares && Object.keys(storedShares).length > 0
      ? participants.map((participant) => roundCurrency(storedShares[participant] ?? 0))
      : splitAmountEqually(amount, participants.length);

    balances[movement.paidBy] += amount;
    for (const [index, participant] of participants.entries()) {
      balances[participant] -= shares[index] ?? 0;
    }
  }

  for (const payment of payments) {
    if (payment.status !== 'confirmada') continue;
    if (!(payment.from in balances) || !(payment.to in balances)) continue;

    const amount = roundCurrency(payment.amount);
    balances[payment.from] += amount;
    balances[payment.to] -= amount;
  }

  return Object.fromEntries(
    Object.entries(balances).map(([memberId, balance]) => [
      memberId,
      roundCurrency(balance),
    ]),
  ) as Record<string, number>;
}

export function calculateSettlements(
  members: Member[],
  balances: Record<string, number>,
): Settlement[] {
  const creditors = members
    .map((member) => ({ id: member.id, amount: balances[member.id] }))
    .filter((entry) => entry.amount > 0.01)
    .sort((a, b) => b.amount - a.amount);
  const debtors = members
    .map((member) => ({ id: member.id, amount: Math.abs(balances[member.id]) }))
    .filter((entry) => entry.amount > 0.01)
    .sort((a, b) => b.amount - a.amount);
  const settlements: Settlement[] = [];

  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = roundCurrency(Math.min(creditor.amount, debtor.amount));

    settlements.push({ from: debtor.id, to: creditor.id, amount });
    creditor.amount = roundCurrency(creditor.amount - amount);
    debtor.amount = roundCurrency(debtor.amount - amount);

    if (creditor.amount <= 0.01) creditorIndex += 1;
    if (debtor.amount <= 0.01) debtorIndex += 1;
  }

  return settlements;
}
