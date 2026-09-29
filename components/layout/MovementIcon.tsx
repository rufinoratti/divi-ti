'use client';

import {
  Building2Icon,
  CarFrontIcon,
  HandCoinsIcon,
  ReceiptTextIcon,
  ShoppingBagIcon,
  UtensilsIcon,
} from 'lucide-react';
import { type MovementCategory } from '@/lib/ledger';

interface MovementIconProps {
  category: MovementCategory;
}

const categoryToIcon: Record<MovementCategory, React.ElementType> = {
  Alquiler: Building2Icon,
  Comida: UtensilsIcon,
  Transporte: CarFrontIcon,
  Compras: ShoppingBagIcon,
  Otros: ReceiptTextIcon,
  Préstamo: HandCoinsIcon,
};

export function MovementIcon({ category }: MovementIconProps) {
  const Icon = categoryToIcon[category] ?? HandCoinsIcon;

  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-[#594ff4] ring-1 ring-[#e7e7e7]">
      <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
    </span>
  );
}
