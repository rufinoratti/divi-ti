'use client';

import { type Tab } from '@/hooks/useMovements';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  HomeIcon,
  ChartNoAxesCombinedIcon,
  WalletCardsIcon,
  UserRoundIcon,
  LogOut,
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
  const { logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 border-t border-[#e7e7e7] bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm">
      <div className="mx-auto grid max-w-[500px] grid-cols-4 gap-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-bold transition active:scale-[0.96] ${isActive ? 'bg-[#f6f6f6] text-[#594ff4]' : 'text-[#5d5d5d]'}`}
            >
              <Icon aria-hidden="true" size={20} strokeWidth={isActive ? 2.15 : 1.8} />
              {item.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={handleLogout}
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-bold text-[#b42318] transition active:scale-[0.96] hover:bg-[#fef4f4]"
          aria-label="Cerrar sesión"
        >
          <LogOut aria-hidden="true" size={20} strokeWidth={1.8} />
          Salir
        </button>
      </div>
    </nav>
  );
}
