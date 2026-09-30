'use client';

import { useState } from 'react';

import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import { BalanceCard } from '@/components/layout/BalanceCard';
import { MovementComposer } from '@/components/features/MovementComposer';
import { BalanceSection } from '@/components/features/BalanceSection';
import { ActivitySection } from '@/components/features/ActivitySection';
import { ProfileSection } from '@/components/features/ProfileSection';
import { AllGroupsHome } from '@/components/features/AllGroupsHome';
import { AllGroupsBalanceSection } from '@/components/features/AllGroupsBalanceSection';
import { AppLoading } from '@/components/layout/AppLoading';
import { MovementList } from '@/components/layout/MovementList';
import { useMovements, type Tab } from '@/hooks/useMovements';
import { useAuth } from '@/hooks/useAuth';
import { type LedgerMovement } from '@/lib/ledger';
import { GroupOnboarding } from '@/components/features/GroupOnboarding';
import { GuestOnboarding } from '@/components/features/GuestOnboarding';
import { EmptyGroupsHome } from '@/components/features/EmptyGroupsHome';

type ActivityFilter = 'all' | LedgerMovement['kind'];

function DataError({ message }: { message: string }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-white px-6 text-[#1f1f1f]">
      <section className="max-w-sm text-center" role="alert">
        <h1 className="text-2xl font-bold tracking-[-0.04em]">No pudimos abrir tu grupo</h1>
        <p className="mt-3 text-sm leading-6 text-[#5d5d5d]">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 min-h-12 rounded-full bg-[#594ff4] px-6 text-sm font-bold text-white"
        >
          Volver a intentar
        </button>
      </section>
    </main>
  );
}

export default function Home() {
  const { userId, email, name, isAuthenticated, isLoading } = useAuth();
  const {
    movements,
    isReady,
    loadError,
    addMovement,
    refresh,
    balances,
    settlements,
    members,
    payments,
    currentMemberIds,
    groupLedgers,
    currentMemberId,
    groups,
    groupId,
    groupName,
    groupJoinCode,
    groupOwnerId,
    selectGroup,
  } = useMovements(userId ?? undefined);
  const [activeTab, setActiveTab] = useState<Tab>('inicio');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const totalExpenses = movements.filter((m) => m.kind === 'expense').reduce((sum, m) => sum + m.amount, 0);
  const recentMovements = movements.slice(0, 4);
  const filteredMovements = activityFilter === 'all' ? movements : movements.filter((m) => m.kind === activityFilter);

  const handleSubmitMovement = (movement: LedgerMovement) => addMovement(movement);

  const handleGroupChange = (nextGroupId: string | null) => {
    selectGroup(nextGroupId);
    setActiveTab('inicio');
    setActivityFilter('all');
    setComposerOpen(false);
  };

  if (isLoading) return <AppLoading />;

  if (!isAuthenticated) return <GuestOnboarding />;

  if (!isReady) return <AppLoading />;

  if (loadError) return <DataError message={loadError} />;

  if (groups.length === 0) {
    if (isCreatingGroup) return <GroupOnboarding onCancel={() => setIsCreatingGroup(false)} />;
    return <EmptyGroupsHome email={email} onCreateGroup={() => setIsCreatingGroup(true)} />;
  }

  const allGroupsView = groupId === null;
  if (!allGroupsView && !currentMemberId) {
    return <DataError message="Tu cuenta no aparece vinculada a un integrante de este grupo. Volvé a cargar la app; si el problema continúa, pedile al administrador que revise la invitación." />;
  }

  const accountName = name ?? email?.split('@')[0] ?? 'Usuario';
  const accountInitials = accountName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const profileMember = {
    id: userId ?? 'account',
    name: accountName,
    initials: accountInitials || 'US',
  };
  const currentMember = members.find((member) => member.id === currentMemberId);

  function openGroup(groupId: string, tab: Tab = 'inicio') {
    selectGroup(groupId);
    setActiveTab(tab);
    setActivityFilter('all');
    setComposerOpen(false);
  }

  return (
    <main className="min-h-[100dvh] bg-white text-[#1f1f1f]">
      <div className="mx-auto min-h-[100dvh] max-w-[500px] px-5 pb-28 pt-6 sm:px-7">
        <Header
          currentMemberId={currentMemberId}
          members={members}
          profileMember={profileMember}
          groups={groups}
          groupId={groupId}
          groupName={groupName}
          accountName={accountName}
          onGroupChange={handleGroupChange}
          onPaymentsChanged={refresh}
        />

        {activeTab === 'inicio' && (
          allGroupsView ? (
            <AllGroupsHome groups={groupLedgers} onOpenGroup={(nextGroupId) => openGroup(nextGroupId)} />
          ) : (
            <section className="mt-8 space-y-7" aria-labelledby="inicio-title">
              <div>
                <p className="text-[15px] text-[#5d5d5d]">Hola, {currentMember?.name ?? accountName}</p>
                <h1 id="inicio-title" className="mt-1 text-3xl font-bold tracking-[-0.045em]">Tu resumen del grupo</h1>
              </div>

              <BalanceCard currentBalance={balances[currentMemberId!] ?? 0} totalExpenses={totalExpenses} memberCount={members.length} onViewBalance={() => setActiveTab('balance')} onAddMovement={() => setComposerOpen(true)} />

              <section aria-labelledby="recent-title">
                <div className="mb-4 flex items-end justify-between">
                  <h2 id="recent-title" className="text-xl font-bold tracking-[-0.035em]">Movimientos recientes</h2>
                  <button type="button" onClick={() => setActiveTab('actividad')} className="text-sm font-bold text-[#594ff4] active:scale-[0.98]">Ver todos</button>
                </div>
                <MovementList movements={recentMovements} members={members} currentMemberId={currentMemberId} />
              </section>
            </section>
          )
        )}

        {activeTab === 'actividad' && (
          <ActivitySection
            members={members}
            movements={filteredMovements}
            currentMemberId={currentMemberId}
            currentMemberIds={allGroupsView ? currentMemberIds : undefined}
            allGroups={allGroupsView}
            activityFilter={activityFilter}
            onActivityFilterChange={setActivityFilter}
          />
        )}

        {activeTab === 'balance' && (
          allGroupsView ? (
            <AllGroupsBalanceSection groups={groupLedgers} onOpenGroup={(nextGroupId) => openGroup(nextGroupId, 'balance')} />
          ) : (
            <BalanceSection
              members={members}
              balances={balances}
              settlements={settlements}
              payments={payments}
              groupId={groupId!}
              currentMemberId={currentMemberId!}
              onPaymentChanged={refresh}
            />
          )
        )}

        {activeTab === 'perfil' && (
          <ProfileSection
            currentMemberId={currentMemberId}
            members={members}
            profileMember={profileMember}
            accountEmail={email}
            allGroupsView={allGroupsView}
            groupCount={groups.length}
            groupName={groupName}
            groupId={groupId}
            groupJoinCode={groupJoinCode}
            canInvite={userId === groupOwnerId}
          />
        )}
      </div>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {!allGroupsView && currentMemberId && groupId && (
        <MovementComposer key={groupId} open={composerOpen} onOpenChange={setComposerOpen} members={members} currentMemberId={currentMemberId} onSubmit={handleSubmitMovement} />
      )}
    </main>
  );
}
