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
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 border-t border-[#e7e7e7] bg-white/95 px-4 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))_+_0.75rem)] pt-3 backdrop-blur-sm">
      <div className="relative mx-auto grid max-w-[500px] grid-cols-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/4 transition-transform duration-500 [transition-timing-function:cubic-bezier(0.175,0.885,0.32,1.1)] motion-reduce:transition-none"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        >
          <span className="absolute inset-1 rounded-2xl bg-[#efedff]" />
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
              className={`relative z-10 flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-bold transition-colors duration-150 ${isActive ? 'text-[#594ff4]' : 'text-[#5d5d5d]'}`}
            >
              <Icon aria-hidden="true" size={20} strokeWidth={isActive ? 2.15 : 1.8} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
