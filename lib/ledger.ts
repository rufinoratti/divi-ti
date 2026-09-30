export type Member = {
  id: string;
  name: string;
  initials: string;
  userId?: string | null;
};

export type MovementKind = 'expense' | 'loan';

export type DivisionMethod = 'equal' | 'consumption' | 'income';

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
  divisionMethod?: DivisionMethod;
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

export type NetMemberBalance = {
  memberId: string;
  amount: number;
};

export type SettlementSuggestion = {
  from: string;
  to: string;
  amount: number;
};

export type SettlementSuggestionResult = {
  supported: boolean;
  transfers: SettlementSuggestion[];
  reason?: 'group_too_large' | 'unbalanced';
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

export function splitAmountEquallyByMemberId(amount: number, participantIds: string[]) {
  const sortedIds = [...participantIds].sort();
  const amounts = splitAmountEqually(amount, sortedIds.length);
  return Object.fromEntries(sortedIds.map((memberId, index) => [memberId, amounts[index] ?? 0]));
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
      const equalShares = splitAmountEquallyByMemberId(movement.amount, participants);
      const shares = storedShares && Object.keys(storedShares).length > 0
        ? Object.fromEntries(participants.map((participant) => [participant, roundCurrency(storedShares[participant] ?? 0)]))
        : equalShares;

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

/** Positive balances are owed money; negative balances need to pay. */
export function calculateNetMemberBalances(
  members: Member[],
  movements: LedgerMovement[],
  payments: SettlementPayment[] = [],
): NetMemberBalance[] {
  const balances = new Map(members.map((member) => [member.id, 0]));
  const add = (memberId: string, amountCents: number) => {
    balances.set(memberId, (balances.get(memberId) ?? 0) + amountCents);
  };

  for (const movement of movements) {
    const amountCents = toCurrencyCents(movement.amount);
    if (movement.kind === 'loan' && movement.recipient) {
      add(movement.paidBy, amountCents);
      add(movement.recipient, -amountCents);
      continue;
    }

    add(movement.paidBy, amountCents);
    const participants = movement.participants.length
      ? movement.participants
      : members.map((member) => member.id);
    const shares = movement.participantShares && Object.keys(movement.participantShares).length > 0
      ? movement.participantShares
      : splitAmountEquallyByMemberId(movement.amount, participants);

    for (const memberId of participants) {
      add(memberId, -toCurrencyCents(shares[memberId] ?? 0));
    }
  }

  for (const payment of payments) {
    if (payment.status !== 'confirmada' || !payment.movementId) continue;
    const amountCents = toCurrencyCents(payment.amount);
    add(payment.from, amountCents);
    add(payment.to, -amountCents);
  }

  return members.map((member) => ({
    memberId: member.id,
    amount: (balances.get(member.id) ?? 0) / 100,
  }));
}

/** Finds an exact minimum-transfer plan for small household groups. */
export function suggestMinimumTransfers(
  balances: NetMemberBalance[],
  maxMembers = 8,
): SettlementSuggestionResult {
  if (balances.length > maxMembers) {
    return { supported: false, transfers: [], reason: 'group_too_large' };
  }

  const totalCents = balances.reduce((sum, balance) => sum + toCurrencyCents(balance.amount), 0);
  if (totalCents !== 0) {
    return { supported: false, transfers: [], reason: 'unbalanced' };
  }

  const entries = balances
    .map((balance) => ({ memberId: balance.memberId, cents: toCurrencyCents(balance.amount) }))
    .filter((balance) => balance.cents !== 0)
    .sort((left, right) => left.memberId.localeCompare(right.memberId));
  if (entries.length < 2) return { supported: true, transfers: [] };

  let best: SettlementSuggestion[] | null = null;
  const path: SettlementSuggestion[] = [];

  function search(startIndex: number) {
    while (startIndex < entries.length && entries[startIndex]!.cents === 0) startIndex += 1;
    if (startIndex === entries.length) {
      if (!best || path.length < best.length) best = [...path];
      return;
    }
    if (best && path.length >= best.length) return;

    const current = entries[startIndex]!;
    const triedBalances = new Set<number>();
    for (let index = startIndex + 1; index < entries.length; index += 1) {
      const other = entries[index]!;
      if (current.cents * other.cents >= 0 || triedBalances.has(other.cents)) continue;
      triedBalances.add(other.cents);

      const amountCents = Math.min(Math.abs(current.cents), Math.abs(other.cents));
      const currentCents = current.cents;
      const otherCents = other.cents;
      const from = currentCents < 0 ? current.memberId : other.memberId;
      const to = currentCents > 0 ? current.memberId : other.memberId;

      if (currentCents < 0) {
        current.cents += amountCents;
        other.cents -= amountCents;
      } else {
        current.cents -= amountCents;
        other.cents += amountCents;
      }

      path.push({ from, to, amount: amountCents / 100 });
      search(startIndex);
      path.pop();
      current.cents = currentCents;
      other.cents = otherCents;

      if (currentCents + otherCents === 0) break;
    }
  }

  search(0);
  return { supported: true, transfers: best ?? [] };
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
