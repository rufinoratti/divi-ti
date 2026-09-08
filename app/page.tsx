'use client';

import { useState } from 'react';
import {
  BellIcon,
  HandCoinsIcon,
  ReceiptTextIcon,
  ShoppingBagIcon,
  UtensilsIcon,
  UserRoundIcon,
  WalletCardsIcon,
  HomeIcon,
  PlusIcon,
  ChartNoAxesCombinedIcon,
  ChevronRightIcon,
} from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import { BalanceCard } from '@/components/layout/BalanceCard';
import { MovementComposer } from '@/components/features/MovementComposer';
import { BalanceSection } from '@/components/features/BalanceSection';
import { ActivitySection } from '@/components/features/ActivitySection';
import { ProfileSection } from '@/components/features/ProfileSection';
import { AppLoading } from '@/components/layout/AppLoading';
import { MovementList } from '@/components/layout/MovementList';
import { useMovements, defaultMembers, type Tab } from '@/hooks/useMovements';
import { type LedgerMovement } from '@/lib/ledger';

const currentMemberId = 'martina';

type ActivityFilter = 'all' | LedgerMovement['kind'];

export default function Home() {
  const { movements, isReady, addMovement, balances, settlements, members, groupName } = useMovements();
  const [activeTab, setActiveTab] = useState<Tab>('inicio');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [composerOpen, setComposerOpen] = useState(false);

  const totalExpenses = movements.filter((m) => m.kind === 'expense').reduce((sum, m) => sum + m.amount, 0);
  const recentMovements = movements.slice(0, 4);
  const filteredMovements = activityFilter === 'all' ? movements : movements.filter((m) => m.kind === activityFilter);

  const currentBalance = balances[currentMemberId];

  const handleSubmitMovement = (movement: LedgerMovement) => {
    addMovement(movement);
  };

  if (!isReady) return <AppLoading />;

  return (
    <main className="min-h-[100dvh] bg-white text-[#1f1f1f]">
      <div className="mx-auto min-h-[100dvh] max-w-[500px] px-5 pb-28 pt-6 sm:px-7">
        <Header currentMemberId={currentMemberId} members={members} groupName={groupName} onActivityClick={() => setActiveTab('actividad')} onBalanceClick={() => setActiveTab('balance')} />

        {activeTab === 'inicio' && (
          <section className="mt-8 space-y-7" aria-labelledby="inicio-title">
            <div>
              <p className="text-[15px] text-[#5d5d5d]">Hola, Martina</p>
              <h1 id="inicio-title" className="mt-1 text-3xl font-bold tracking-[-0.045em]">Tu resumen del grupo</h1>
            </div>

            <BalanceCard currentBalance={currentBalance} totalExpenses={totalExpenses} memberCount={members.length} onViewBalance={() => setActiveTab('balance')} onAddMovement={() => setComposerOpen(true)} />

            <section aria-labelledby="recent-title">
              <div className="mb-4 flex items-end justify-between">
                <h2 id="recent-title" className="text-xl font-bold tracking-[-0.035em]">Movimientos recientes</h2>
                <button type="button" onClick={() => setActiveTab('actividad')} className="text-sm font-bold text-[#594ff4] active:scale-[0.98]">Ver todos</button>
              </div>
              <MovementList movements={recentMovements} members={members} currentMemberId={currentMemberId} />
            </section>
          </section>
        )}

        {activeTab === 'actividad' && (
          <ActivitySection members={members} movements={movements} currentMemberId={currentMemberId} activityFilter={activityFilter} onActivityFilterChange={setActivityFilter} />
        )}

        {activeTab === 'balance' && <BalanceSection members={members} balances={balances} settlements={settlements} />}

        {activeTab === 'perfil' && <ProfileSection currentMemberId={currentMemberId} members={members} />}
      </div>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <MovementComposer open={composerOpen} onOpenChange={setComposerOpen} members={members} currentMemberId={currentMemberId} onSubmit={handleSubmitMovement} />
    </main>
  );
}
