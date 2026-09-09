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
import { GuestOnboarding } from '@/components/features/GuestOnboarding';

type ActivityFilter = 'all' | LedgerMovement['kind'];

export default function Home() {
  const { memberId, userId, isAuthenticated, isLoading } = useAuth();
  const { movements, isReady, addMovement, updateMovement, refreshMovements, balances, settlements, members, groupId, groupName, groupOwnerId } = useMovements(memberId ?? undefined);
  const [activeTab, setActiveTab] = useState<Tab>('inicio');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<LedgerMovement | null>(null);

  const totalExpenses = movements.filter((m) => m.kind === 'expense').reduce((sum, m) => sum + m.amount, 0);
  const recentMovements = movements.slice(0, 4);
  const filteredMovements = activityFilter === 'all' ? movements : movements.filter((m) => m.kind === activityFilter);

  const handleSubmitMovement = async (movement: LedgerMovement) => {
    if (editingMovement) {
      await updateMovement(movement);
      return;
    }

    await addMovement(movement);
  };

  const openNewMovement = () => {
    setEditingMovement(null);
    setComposerOpen(true);
  };

  const openEditMovement = async (movement: LedgerMovement) => {
    const latestMovements = await refreshMovements();
    const latestMovement = latestMovements.find((item) => item.id === movement.id)
      ?? latestMovements.find((item) => (
        item.kind === movement.kind
        && item.description === movement.description
        && item.amount === movement.amount
        && item.paidBy === movement.paidBy
      ));

    if (!latestMovement) return;

    setEditingMovement(latestMovement);
    setComposerOpen(true);
  };

  if (isLoading) return <AppLoading />;

  if (!isAuthenticated) return <GuestOnboarding />;

  if (!isReady) return <AppLoading />;

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

            <BalanceCard currentBalance={balances[currentMemberId] ?? 0} totalExpenses={totalExpenses} memberCount={members.length} onViewBalance={() => setActiveTab('balance')} onAddMovement={openNewMovement} />

            <section aria-labelledby="recent-title">
              <div className="mb-4 flex items-end justify-between">
                <h2 id="recent-title" className="text-xl font-bold tracking-[-0.035em]">Movimientos recientes</h2>
                <button type="button" onClick={() => setActiveTab('actividad')} className="text-sm font-bold text-[#594ff4] active:scale-[0.98]">Ver todos</button>
              </div>
              <MovementList movements={recentMovements} members={members} currentMemberId={currentMemberId} onEditMovement={openEditMovement} />
            </section>
          </section>
        )}

        {activeTab === 'actividad' && (
          <ActivitySection members={members} movements={filteredMovements} currentMemberId={currentMemberId} activityFilter={activityFilter} onActivityFilterChange={setActivityFilter} onEditMovement={openEditMovement} />
        )}

        {activeTab === 'balance' && <BalanceSection members={members} balances={balances} settlements={settlements} />}

        {activeTab === 'perfil' && (
          <ProfileSection
            currentMemberId={currentMemberId}
            members={members}
            groupName={groupName}
            groupId={groupId}
            canInvite={userId === groupOwnerId}
          />
        )}
      </div>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <MovementComposer
        open={composerOpen}
        onOpenChange={(open) => {
          setComposerOpen(open);
          if (!open) setEditingMovement(null);
        }}
        members={members}
        currentMemberId={currentMemberId}
        editingMovement={editingMovement}
        onSubmit={handleSubmitMovement}
      />
    </main>
  );
}
