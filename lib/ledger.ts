export type Member = {
  id: string;
  name: string;
  initials: string;
};

export type MovementKind = 'expense' | 'loan';

export type MovementCategory =
  | 'Alquiler'
  | 'Comida'
  | 'Transporte'
  | 'Compras'
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
  createdAt: string;
};

export type Settlement = {
  from: string;
  to: string;
  amount: number;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export function calculateBalances(
  members: Member[],
  movements: LedgerMovement[],
) {
  const balances = Object.fromEntries(
    members.map((member) => [member.id, 0]),
  ) as Record<string, number>;

  for (const movement of movements) {
    if (movement.kind === 'loan' && movement.recipient) {
      balances[movement.paidBy] += movement.amount;
      balances[movement.recipient] -= movement.amount;
      continue;
    }

    const participants = movement.participants.length
      ? movement.participants
      : members.map((member) => member.id);
    const share = movement.amount / participants.length;

    balances[movement.paidBy] += movement.amount;
    for (const participant of participants) {
      balances[participant] -= share;
    }
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
