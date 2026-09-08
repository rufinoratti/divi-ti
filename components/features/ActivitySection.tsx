'use client';

import { type Member, type LedgerMovement } from '@/lib/ledger';
import { MovementList } from '@/components/layout/MovementList';

type ActivityFilter = 'all' | LedgerMovement['kind'];

interface ActivitySectionProps {
  members: Member[];
  movements: LedgerMovement[];
  currentMemberId: string;
  activityFilter: ActivityFilter;
  onActivityFilterChange: (filter: ActivityFilter) => void;
}

export function ActivitySection({
  members,
  movements,
  currentMemberId,
  activityFilter,
  onActivityFilterChange,
}: ActivitySectionProps) {
  return (
    <section className="mt-8" aria-labelledby="activity-title">
      <h1 id="activity-title" className="text-3xl font-bold tracking-[-0.045em]">Actividad</h1>
      <p className="mt-2 text-sm leading-6 text-[#5d5d5d]">Cada carga actualiza el balance del grupo al instante.</p>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1" aria-label="Filtros de actividad">
        {[
          { id: 'all' as const, label: 'Todos' },
          { id: 'expense' as const, label: 'Gastos' },
          { id: 'loan' as const, label: 'Préstamos' },
        ].map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => onActivityFilterChange(filter.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${activityFilter === filter.id ? 'bg-[#594ff4] text-white' : 'bg-[#f6f6f6] text-[#5d5d5d]'}`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        <MovementList movements={movements} members={members} currentMemberId={currentMemberId} emptyLabel="No hay movimientos para este filtro." />
      </div>
    </section>
  );
}
