import { describe, expect, it } from 'vitest';

import { createMovementSchema, incomeSplitPreviewSchema, profileIncomeSchema } from '@/lib/api/schemas';

const groupId = '10000000-0000-4000-8000-000000000001';
const payerId = '20000000-0000-4000-8000-000000000002';
const anaId = '30000000-0000-4000-8000-000000000003';
const juanId = '40000000-0000-4000-8000-000000000004';

describe('profile income API contract', () => {
  it('accepts a positive optional income and an explicit clear', () => {
    expect(profileIncomeSchema.safeParse({ income: 850000 }).success).toBe(true);
    expect(profileIncomeSchema.safeParse({ income: null }).success).toBe(true);
  });

  it('rejects zero, negative, and unexpected profile fields', () => {
    expect(profileIncomeSchema.safeParse({ income: 0 }).success).toBe(false);
    expect(profileIncomeSchema.safeParse({ income: -1 }).success).toBe(false);
    expect(profileIncomeSchema.safeParse({ income: 0.001 }).success).toBe(false);
    expect(profileIncomeSchema.safeParse({ income: 850000, userId: payerId }).success).toBe(false);
  });
});

describe('income split preview API contract', () => {
  const preview = { groupId, amount: 18000, participants: [anaId, juanId] };

  it('accepts a valid group preview request', () => {
    expect(incomeSplitPreviewSchema.safeParse(preview).success).toBe(true);
  });

  it('rejects repeated members and totals smaller than one cent per person', () => {
    expect(incomeSplitPreviewSchema.safeParse({ ...preview, participants: [anaId, anaId] }).success).toBe(false);
    expect(incomeSplitPreviewSchema.safeParse({ ...preview, amount: 0.01 }).success).toBe(false);
  });
});

describe('movement API contract', () => {
  const baseMovement = {
    groupId,
    kind: 'expense' as const,
    description: 'Cena',
    amount: 18000,
    category: 'Comida' as const,
    divisionMethod: 'equal' as const,
    paidBy: payerId,
    participants: [anaId, juanId],
    recipient: null,
  };

  it('accepts an equally divided group expense', () => {
    expect(createMovementSchema.safeParse(baseMovement).success).toBe(true);
  });

  it('rejects duplicate participants and nonpositive amounts', () => {
    expect(createMovementSchema.safeParse({ ...baseMovement, participants: [anaId, anaId] }).success).toBe(false);
    expect(createMovementSchema.safeParse({ ...baseMovement, amount: 0 }).success).toBe(false);
  });
});
