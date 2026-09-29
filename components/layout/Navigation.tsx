'use client';

import { useState } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const activeIndex = navigation.findIndex((item) => item.id === activeTab);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await logout();
    router.replace('/login');
  }

  return (
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 border-t border-[#e7e7e7] bg-white/95 px-4 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))_+_0.75rem)] pt-3 backdrop-blur-sm">
      <div className="relative mx-auto grid max-w-[500px] grid-cols-5">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/5 transition-transform duration-500 [transition-timing-function:cubic-bezier(0.175,0.885,0.32,1.1)] motion-reduce:transition-none"
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
              className={`relative z-10 flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-bold transition-colors duration-150 ${isActive ? 'text-[#594ff4]' : 'text-[#5d5d5d]'}`}
            >
              <Icon aria-hidden="true" size={20} strokeWidth={isActive ? 2.15 : 1.8} />
              {item.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setLogoutConfirmationOpen(true)}
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-bold text-[#b42318] transition active:scale-[0.96] hover:bg-[#fef4f4]"
          aria-label="Cerrar sesión"
        >
          <LogOut aria-hidden="true" size={20} strokeWidth={1.8} />
          Salir
        </button>
      </div>

      <AlertDialog open={logoutConfirmationOpen} onOpenChange={setLogoutConfirmationOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-[28px] border border-[#e7e7e7] bg-white p-6 sm:max-w-sm">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-xl font-bold tracking-[-0.035em]">
              ¿Querés cerrar sesión?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-6 text-[#5d5d5d]">
              Vas a salir de tu cuenta de Divi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mx-0 mb-0 grid grid-cols-2 gap-3 rounded-none border-0 bg-transparent p-0">
            <AlertDialogCancel
              disabled={isLoggingOut}
              className="min-h-12 rounded-full border-[#e7e7e7] bg-white px-4 text-sm font-bold text-[#1f1f1f] hover:bg-[#f6f6f6]"
            >
              No, quedarme
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isLoggingOut}
              onClick={() => { void handleLogout(); }}
              className="min-h-12 rounded-full bg-[#b42318] px-4 text-sm font-bold text-white hover:bg-[#912018]"
            >
              {isLoggingOut ? 'Saliendo...' : 'Sí, cerrar sesión'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
}
