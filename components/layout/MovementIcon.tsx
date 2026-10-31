'use client';

import {
  Buildings,
  Car,
  ForkKnife,
  HandCoins,
  Receipt,
  ShoppingBag,
} from '@phosphor-icons/react';
import { Icon, type PhosphorIcon } from '@/components/ui/icon';
import { type MovementCategory } from '@/lib/ledger';

interface MovementIconProps {
  category: MovementCategory;
}

const categoryToIcon: Record<MovementCategory, PhosphorIcon> = {
  Alquiler: Buildings,
  Comida: ForkKnife,
  Transporte: Car,
  Compras: ShoppingBag,
  Otros: Receipt,
  Préstamo: HandCoins,
};

export function MovementIcon({ category }: MovementIconProps) {
  const Glyph = categoryToIcon[category] ?? HandCoins;

  return (
    <span className="divi-icon-well size-11 rounded-[var(--radius-control)]">
      <Icon icon={Glyph} size="md" aria-hidden="true" />
    </span>
  );
}
