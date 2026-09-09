'use client';

import { useState } from 'react';

import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import { BalanceCard } from '@/components/layout/BalanceCard';
import { MovementComposer } from '@/components/features/MovementComposer';
import { BalanceSection } from '@/components/features/BalanceSection';
import { ActivitySection } from '@/components/features/ActivitySection';
import { ProfileSection } from '@/components/features/ProfileSection';
import { AppLoading } from '@/components/layout/AppLoading';
import { MovementList } from '@/components/layout/MovementList';
import { useMovements, type Tab } from '@/hooks/useMovements';
import { useAuth } from '@/hooks/useAuth';
import { type LedgerMovement } from '@/lib/ledger';
import { GroupOnboarding } from '@/components/features/GroupOnboarding';

type ActivityFilter = 'all' | LedgerMovement['kind'];

export default function Home() {
  const { memberId, isAuthenticated, isLoading } = useAuth();
  const { movements, isReady, addMovement, balances, settlements, members, groupName } = useMovements(memberId ?? undefined);
  const [activeTab, setActiveTab] = useState<Tab>('inicio');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [composerOpen, setComposerOpen] = useState(false);

  const totalExpenses = movements.filter((m) => m.kind === 'expense').reduce((sum, m) => sum + m.amount, 0);
  const recentMovements = movements.slice(0, 4);
  const filteredMovements = activityFilter === 'all' ? movements : movements.filter((m) => m.kind === activityFilter);

  const handleSubmitMovement = (movement: LedgerMovement) => {
    addMovement(movement);
  };

  if (isLoading || !isReady) return <AppLoading />;

  if (!isAuthenticated) {
    return (
      <main className="min-h-[100dvh] bg-white text-[#1f1f1f]">
        <div className="mx-auto max-w-[500px] px-5 py-6">
          <div className="mt-12 text-center space-y-4">
            <h1 className="text-3xl font-bold tracking-[-0.045em]">Divi</h1>
            <p className="text-[#5d5d5d]">Iniciá sesión para acceder al grupo</p>
            <a href="/login" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#594ff4] px-5 text-sm font-bold text-white transition active:scale-[0.98]">
              Iniciar sesión
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (!memberId) return <GroupOnboarding />;

  const currentMemberId = memberId;
  const currentMember = members.find((m) => m.id === currentMemberId);

  return (
    <main className="min-h-[100dvh] bg-white text-[#1f1f1f]">
      <div className="mx-auto min-h-[100dvh] max-w-[500px] px-5 pb-28 pt-6 sm:px-7">
        <Header currentMemberId={currentMemberId} members={members} groupName={groupName} onActivityClick={() => setActiveTab('actividad')} onBalanceClick={() => setActiveTab('balance')} />

        {activeTab === 'inicio' && (
          <section className="mt-8 space-y-7" aria-labelledby="inicio-title">
            <div>
              <p className="text-[15px] text-[#5d5d5d]">Hola, {currentMember?.name ?? 'Usuario'}</p>
              <h1 id="inicio-title" className="mt-1 text-3xl font-bold tracking-[-0.045em]">Tu resumen del grupo</h1>
            </div>

            <BalanceCard currentBalance={balances[currentMemberId] ?? 0} totalExpenses={totalExpenses} memberCount={members.length} onViewBalance={() => setActiveTab('balance')} onAddMovement={() => setComposerOpen(true)} />

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
          <ActivitySection members={members} movements={filteredMovements} currentMemberId={currentMemberId} activityFilter={activityFilter} onActivityFilterChange={setActivityFilter} />
        )}

        {activeTab === 'balance' && <BalanceSection members={members} balances={balances} settlements={settlements} />}

        {activeTab === 'perfil' && <ProfileSection currentMemberId={currentMemberId} members={members} />}
      </div>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <MovementComposer open={composerOpen} onOpenChange={setComposerOpen} members={members} currentMemberId={currentMemberId} onSubmit={handleSubmitMovement} />
    </main>
  );
}
