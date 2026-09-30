import { describe, expect, it } from 'vitest';

import { createMovementSchema } from '@/lib/api/schemas';
import {
  calculateNetMemberBalances,
  splitAmountEqually,
  splitAmountEquallyByMemberId,
  suggestMinimumTransfers,
  type LedgerMovement,
  type Member,
  type SettlementPayment,
} from '@/lib/ledger';
import { interpretMovementText, parseCurrencyAmount } from '@/lib/movement-draft';
import { parseReceiptText } from '@/lib/receipt-ocr';

const members: Member[] = [
  { id: 'member-ana', name: 'Ana', initials: 'AN' },
  { id: 'member-juan', name: 'Juan Pérez', initials: 'JP' },
  { id: 'member-luz', name: 'Luz', initials: 'LU' },
];

describe('movement amounts and drafts', () => {
  it.each([
    ['$ 1.234,56', 1234.56],
    ['3000', 3000],
    ['2.500', 2500],
    ['12,5', 12.5],
  ])('parses Argentine amount %s', (input, expected) => {
    expect(parseCurrencyAmount(input)).toBe(expected);
  });

  it('rejects negative and malformed amounts instead of changing their value', () => {
    expect(parseCurrencyAmount('-3000')).toBeNull();
    expect(parseCurrencyAmount('1.2.3')).toBeNull();
  });

  it('interprets a loan phrase and resolves a named group member', () => {
    const draft = interpretMovementText('Le presté $3.000 a Juan Pérez', members, 'member-ana');

    expect(draft.kind).toBe('loan');
    expect(draft.amount).toBe(3000);
    expect(draft.paidBy).toBe('member-ana');
    expect(draft.recipient).toBe('member-juan');
    expect(draft.confidence).toBe('high');
  });

  it('keeps ambiguous loans editable and does not select a recipient', () => {
    const draft = interpretMovementText('Le presté $3.000 a Martín', members, 'member-ana');

    expect(draft.kind).toBe('loan');
    expect(draft.recipient).toBeNull();
    expect(draft.confidence).toBe('review');
  });

  it('classifies a group expense phrase and selects a category', () => {
    const draft = interpretMovementText('Gastamos $1.234,56 en el supermercado', members, 'member-ana');

    expect(draft.kind).toBe('expense');
    expect(draft.amount).toBe(1234.56);
    expect(draft.category).toBe('Comida');
  });

  it('extracts ticket total and description from OCR text', () => {
    const draft = parseReceiptText('KIOSCO CENTRAL\nCUIT 30-12345678-9\nTOTAL A PAGAR $ 12.345,67', 90);

    expect(draft.amount).toBe(12345.67);
    expect(draft.description).toBe('KIOSCO CENTRAL');
    expect(draft.confidence).toBeGreaterThan(70);
  });
});

describe('movement validation', () => {
  const baseMovement = {
    groupId: '00000000-0000-4000-8000-000000000001',
    kind: 'expense' as const,
    description: 'Compra de comida',
    amount: 100,
    category: 'Comida' as const,
    divisionMethod: 'consumption' as const,
    paidBy: '00000000-0000-4000-8000-000000000002',
    participants: [
      '00000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000004',
    ],
    recipient: null,
  };

  it('accepts consumption shares that sum exactly to the movement total', () => {
    expect(createMovementSchema.safeParse({
      ...baseMovement,
      participantShares: {
        '00000000-0000-4000-8000-000000000003': 60,
        '00000000-0000-4000-8000-000000000004': 40,
      },
    }).success).toBe(true);
  });

  it('rejects consumption shares that do not sum to the total', () => {
    expect(createMovementSchema.safeParse({
      ...baseMovement,
      participantShares: {
        '00000000-0000-4000-8000-000000000003': 60,
        '00000000-0000-4000-8000-000000000004': 39.99,
      },
    }).success).toBe(false);
  });
});

describe('net balance and settlement suggestions', () => {
  const sharedExpense: LedgerMovement = {
    id: 'movement-1',
    kind: 'expense',
    description: 'Cena',
    amount: 90,
    paidBy: 'member-ana',
    category: 'Comida',
    participants: ['member-ana', 'member-juan', 'member-luz'],
    divisionMethod: 'equal',
    participantShares: { 'member-ana': 30, 'member-juan': 30, 'member-luz': 30 },
    createdAt: '2026-09-30T12:00:00.000Z',
  };

  it('keeps net balances zero-sum across an expense and a loan', () => {
    const loan: LedgerMovement = {
      id: 'movement-2',
      kind: 'loan',
      description: 'Taxi',
      amount: 10,
      paidBy: 'member-juan',
      recipient: 'member-luz',
      category: 'Préstamo',
      participants: [],
      createdAt: '2026-09-30T12:01:00.000Z',
    };

    const balances = calculateNetMemberBalances(members, [sharedExpense, loan]);

    expect(balances).toEqual([
      { memberId: 'member-ana', amount: 60 },
      { memberId: 'member-juan', amount: -20 },
      { memberId: 'member-luz', amount: -40 },
    ]);
    expect(balances.reduce((sum, balance) => sum + balance.amount, 0)).toBe(0);
  });

  it('applies a confirmed movement payment without changing the source movement', () => {
    const twoMembers: Member[] = members.slice(0, 2);
    const twoPersonExpense: LedgerMovement = {
      ...sharedExpense,
      amount: 10,
      participants: twoMembers.map((member) => member.id),
      participantShares: { 'member-ana': 5, 'member-juan': 5 },
    };
    const payment: SettlementPayment = {
      id: 'payment-1', groupId: 'group-1', movementId: twoPersonExpense.id,
      from: 'member-juan', to: 'member-ana', amount: 5, status: 'confirmada',
      reportedBy: 'user-juan', createdAt: '2026-09-30T12:02:00.000Z',
      resolvedBy: 'user-ana', resolvedAt: '2026-09-30T12:03:00.000Z',
    };

    expect(calculateNetMemberBalances(twoMembers, [twoPersonExpense], [payment]).map((balance) => balance.amount)).toEqual([0, 0]);
    expect(twoPersonExpense.amount).toBe(10);
  });

  it('finds a minimum two-transfer settlement for two debtors and two creditors', () => {
    const plan = suggestMinimumTransfers([
      { memberId: 'a', amount: 5 },
      { memberId: 'b', amount: 5 },
      { memberId: 'c', amount: -5 },
      { memberId: 'd', amount: -5 },
    ]);

    expect(plan.supported).toBe(true);
    expect(plan.transfers).toHaveLength(2);
    expect(plan.transfers.reduce((sum, transfer) => sum + transfer.amount, 0)).toBe(10);
  });

  it('declines an exact suggestion for groups larger than eight', () => {
    const plan = suggestMinimumTransfers(Array.from({ length: 9 }, (_, index) => ({ memberId: String(index), amount: 0 })));

    expect(plan).toEqual({ supported: false, transfers: [], reason: 'group_too_large' });
  });

  it('preserves equal division cents deterministically', () => {
    expect(splitAmountEqually(10, 3)).toEqual([3.34, 3.33, 3.33]);
  });

  it('assigns equal-split remainder to stable member IDs regardless of selection order', () => {
    expect(splitAmountEquallyByMemberId(10, ['c', 'a', 'b'])).toEqual({ a: 3.34, b: 3.33, c: 3.33 });
    expect(splitAmountEquallyByMemberId(10, ['b', 'c', 'a'])).toEqual({ a: 3.34, b: 3.33, c: 3.33 });
  });
});
