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
import { PendingPaymentsSection } from '@/components/features/PaymentActions';
import { AppLoading } from '@/components/layout/AppLoading';
import { MovementList } from '@/components/layout/MovementList';
import { useMovements, type Tab } from '@/hooks/useMovements';
import { useAuth } from '@/hooks/useAuth';
import { type LedgerMovement, type MovementKind } from '@/lib/ledger';
import { GroupOnboarding } from '@/components/features/GroupOnboarding';
import { GuestOnboarding } from '@/components/features/GuestOnboarding';
import { EmptyGroupsHome } from '@/components/features/EmptyGroupsHome';
import { CircleAlertIcon, RefreshCwIcon } from 'lucide-react';

type ActivityFilter = 'all' | LedgerMovement['kind'];

function DataError({ message }: { message: string }) {
  return (
    <main className="divi-page grid place-items-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <section className="w-full max-w-sm rounded-[24px] border border-line bg-white p-6 text-center" role="alert">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff8f7] text-danger">
          <CircleAlertIcon aria-hidden="true" size={22} strokeWidth={1.8} />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-[-0.04em]">No pudimos abrir tu grupo</h1>
        <p className="mt-2 text-sm leading-6 text-copy-muted">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-bold text-white transition active:scale-[0.98]"
        >
          <RefreshCwIcon aria-hidden="true" size={16} />
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
    updateMovement,
    refresh,
    obligations,
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
  const [composerKind, setComposerKind] = useState<MovementKind>('expense');
  const [editingMovement, setEditingMovement] = useState<LedgerMovement | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const totalExpenses = movements.filter((m) => m.kind === 'expense').reduce((sum, m) => sum + m.amount, 0);
  const recentMovements = movements.slice(0, 4);
  const filteredMovements = activityFilter === 'all' ? movements : movements.filter((m) => m.kind === activityFilter);

  const handleSubmitMovement = (movement: LedgerMovement) => editingMovement ? updateMovement(movement) : addMovement(movement);
  const openComposer = (kind: MovementKind) => { setEditingMovement(null); setComposerKind(kind); setComposerOpen(true); };
  const editMovement = (movement: LedgerMovement) => { setEditingMovement(movement); setComposerKind(movement.kind); setComposerOpen(true); };

  const handleGroupChange = (nextGroupId: string | null) => {
    selectGroup(nextGroupId);
    setActiveTab('inicio');
    setActivityFilter('all');
    setComposerOpen(false);
    setEditingMovement(null);
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
  const currentOwing = currentMemberId
    ? obligations.filter((obligation) => obligation.from === currentMemberId).reduce((sum, obligation) => sum + obligation.remainingAmount, 0)
    : 0;
  const currentOwed = currentMemberId
    ? obligations.filter((obligation) => obligation.to === currentMemberId).reduce((sum, obligation) => sum + obligation.remainingAmount, 0)
    : 0;
  const currentOwingCount = currentMemberId
    ? obligations.filter((obligation) => obligation.from === currentMemberId && obligation.remainingAmount > 0).length
    : 0;
  const currentOwedCount = currentMemberId
    ? obligations.filter((obligation) => obligation.to === currentMemberId && obligation.remainingAmount > 0).length
    : 0;

  function openGroup(groupId: string, tab: Tab = 'inicio') {
    selectGroup(groupId);
    setActiveTab(tab);
    setActivityFilter('all');
    setComposerOpen(false);
    setEditingMovement(null);
  }

  return (
    <main className="divi-page">
      <div className="divi-page-shell">
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

        <div key={`${groupId ?? 'all'}-${activeTab}`} className="divi-enter">
        {activeTab === 'inicio' && (
          allGroupsView ? (
            <AllGroupsHome groups={groupLedgers} onOpenGroup={(nextGroupId) => openGroup(nextGroupId)} onPaymentChanged={refresh} />
          ) : (
            <section className="mt-7 space-y-5" aria-labelledby="inicio-title">
              <div>
                <p className="text-sm font-medium text-copy-muted">Hola, {currentMember?.name ?? accountName}</p>
                <h1 id="inicio-title" className="divi-page-title mt-1">Tu resumen del grupo</h1>
              </div>

              <PendingPaymentsSection groups={groupLedgers.filter((group) => group.id === groupId)} onPaymentChanged={refresh} />
              <BalanceCard currentOwing={currentOwing} currentOwed={currentOwed} owingCount={currentOwingCount} owedCount={currentOwedCount} totalExpenses={totalExpenses} memberCount={members.length} onViewBalance={() => setActiveTab('balance')} onAddMovement={() => openComposer('expense')} onAddLoan={() => openComposer('loan')} />

              <section aria-labelledby="recent-title">
                <div className="mb-4 flex items-end justify-between">
                  <h2 id="recent-title" className="divi-section-title">Movimientos recientes</h2>
                  <button type="button" onClick={() => setActiveTab('actividad')} className="text-sm font-bold text-brand active:scale-[0.98]">Ver todos</button>
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
            onEditMovement={allGroupsView ? undefined : editMovement}
            lockedMovementIds={payments.filter((payment) => payment.movementId).map((payment) => payment.movementId!)}
          />
        )}

        {activeTab === 'balance' && (
          allGroupsView ? (
            <AllGroupsBalanceSection groups={groupLedgers} onOpenGroup={(nextGroupId) => openGroup(nextGroupId, 'balance')} />
          ) : (
            <BalanceSection
              members={members}
              movements={movements}
              obligations={obligations}
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
      </div>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {!allGroupsView && currentMemberId && groupId && (
        <MovementComposer key={groupId} open={composerOpen} onOpenChange={(open) => { setComposerOpen(open); if (!open) setEditingMovement(null); }} members={members} currentMemberId={currentMemberId} groupId={groupId} initialKind={composerKind} editingMovement={editingMovement} onSubmit={handleSubmitMovement} />
      )}
    </main>
  );
}
