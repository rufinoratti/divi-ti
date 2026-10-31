'use client';

import { type Tab } from '@/hooks/useMovements';
import {
  HomeIcon,
  ChartNoAxesCombinedIcon,
  WalletCardsIcon,
  UserRoundIcon,
} from 'lucide-react';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const navigation = [
  { id: 'inicio' as const, label: 'Inicio', icon: HomeIcon },
  { id: 'actividad' as const, label: 'Actividad', icon: ChartNoAxesCombinedIcon },
  { id: 'balance' as const, label: 'Balance', icon: WalletCardsIcon },
  { id: 'perfil' as const, label: 'Perfil', icon: UserRoundIcon },
];

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const activeIndex = navigation.findIndex((item) => item.id === activeTab);

  return (
    <nav aria-label="Navegación principal" className="app-navigation fixed inset-x-0 bottom-0 z-30 px-4 pt-2">
      <div className="relative mx-auto grid max-w-[500px] grid-cols-4 gap-1">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/4 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        >
          <span className="absolute inset-1 rounded-2xl bg-brand-soft" />
        </span>
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative z-10 flex min-h-[3.4rem] flex-col items-center justify-center gap-0.5 rounded-2xl text-[0.68rem] font-semibold transition-colors duration-150 ${isActive ? 'text-brand' : 'text-copy-muted'}`}
            >
              <Icon aria-hidden="true" size={19} strokeWidth={isActive ? 2.05 : 1.8} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
