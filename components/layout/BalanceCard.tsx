'use client';

import { formatARS } from '@/lib/utils';

interface BalanceCardProps {
  currentBalance: number;
  totalExpenses: number;
  memberCount: number;
  onViewBalance: () => void;
  onAddMovement: () => void;
}

export function BalanceCard({ currentBalance, totalExpenses, memberCount, onViewBalance, onAddMovement }: BalanceCardProps) {
  return (
    <>
      <section className="rounded-[30px] border border-[#dcd6ff] bg-[#ebe8ff] p-6" aria-label="Balance personal">
        <p className="text-sm font-semibold text-[#5144d8]">Tu balance neto</p>
        <p className="mt-3 text-[clamp(2.6rem,11vw,4rem)] font-bold leading-none tracking-[-0.06em] tabular-nums text-[#493dd0]">{formatARS(currentBalance)}</p>
        <p className="mt-3 max-w-[30ch] text-sm leading-6 text-[#49436f]">
          {currentBalance >= 0 ? 'El grupo te debe este importe en total.' : 'Este es el importe total que te falta saldar.'}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#d4cefa] pt-5">
          <div>
            <p className="text-xs font-semibold text-[#5f588c]">Gastos del mes</p>
            <p className="mt-1 text-lg font-bold tracking-[-0.025em] tabular-nums text-[#302a58]">{formatARS(totalExpenses)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#5f588c]">Integrantes</p>
            <p className="mt-1 text-lg font-bold tracking-[-0.025em] text-[#302a58]">{memberCount} personas</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onAddMovement} className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#594ff4] px-5 text-sm font-bold text-white transition active:scale-[0.98]">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          Agregar movimiento
        </button>
        <button type="button" onClick={onViewBalance} className="flex min-h-14 items-center justify-center gap-2 rounded-full border border-[#b0b0b0] bg-white px-5 text-sm font-bold text-[#1f1f1f] transition active:scale-[0.98]">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          Ver balance
        </button>
      </div>
    </>
  );
}
