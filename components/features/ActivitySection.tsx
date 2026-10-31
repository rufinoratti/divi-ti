'use client';

import { type Member, type LedgerMovement } from '@/lib/ledger';
import { MovementList } from '@/components/layout/MovementList';

type ActivityFilter = 'all' | LedgerMovement['kind'];

interface ActivitySectionProps {
  members: Member[];
  movements: LedgerMovement[];
  currentMemberId: string | null;
  currentMemberIds?: string[];
  allGroups?: boolean;
  activityFilter: ActivityFilter;
  onActivityFilterChange: (filter: ActivityFilter) => void;
  onEditMovement?: (movement: LedgerMovement) => void;
  lockedMovementIds?: string[];
}

export function ActivitySection({
  members,
  movements,
  currentMemberId,
  currentMemberIds,
  allGroups = false,
  activityFilter,
  onActivityFilterChange,
  onEditMovement,
  lockedMovementIds,
}: ActivitySectionProps) {
  return (
    <section className="mt-8" aria-labelledby="activity-title">
      <h1 id="activity-title" className="divi-page-title">Actividad</h1>
      <p className="mt-2 text-sm leading-6 text-copy-muted">
        {allGroups
          ? 'Movimientos de todos tus grupos, ordenados por fecha.'
          : 'Cada carga actualiza el balance del grupo al instante.'}
      </p>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filtros de actividad">
        {[
          { id: 'all' as const, label: 'Todos' },
          { id: 'expense' as const, label: 'Gastos' },
          { id: 'loan' as const, label: 'Préstamos' },
        ].map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => onActivityFilterChange(filter.id)}
            aria-pressed={activityFilter === filter.id}
            className={`min-h-10 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition active:scale-[0.98] ${activityFilter === filter.id ? 'bg-brand text-white' : 'bg-surface text-copy-muted'}`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="mt-5">
        <MovementList movements={movements} members={members} currentMemberId={currentMemberId} currentMemberIds={currentMemberIds} emptyLabel="No hay movimientos para este filtro." onEdit={onEditMovement} lockedMovementIds={lockedMovementIds} />
      </div>
    </section>
  );
}
