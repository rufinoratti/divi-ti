'use client';

interface QuickActionsProps {
  onAddMovement?: () => void;
  onViewBalance: () => void;
}

export function QuickActions({ onViewBalance }: QuickActionsProps) {
  return (
    <section aria-labelledby="recent-title">
      <div className="mb-4 flex items-end justify-between">
        <h2 id="recent-title" className="divi-section-title">Movimientos recientes</h2>
        <button type="button" onClick={onViewBalance} className="text-sm font-bold text-brand active:scale-[0.98]">Ver todos</button>
      </div>
    </section>
  );
}
