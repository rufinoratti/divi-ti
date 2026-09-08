'use client';

interface QuickActionsProps {
  onAddMovement?: () => void;
  onViewBalance: () => void;
}

export function QuickActions({ onViewBalance }: QuickActionsProps) {
  return (
    <section aria-labelledby="recent-title">
      <div className="mb-4 flex items-end justify-between">
        <h2 id="recent-title" className="text-xl font-bold tracking-[-0.035em]">Movimientos recientes</h2>
        <button type="button" onClick={onViewBalance} className="text-sm font-bold text-[#594ff4] active:scale-[0.98]">Ver todos</button>
      </div>
    </section>
  );
}
