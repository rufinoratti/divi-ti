'use client';

import { formatARS } from '@/lib/utils';

interface BalanceCardProps {
  currentOwing: number;
  currentOwed: number;
  owingCount: number;
  owedCount: number;
  totalExpenses: number;
  memberCount: number;
  onViewBalance: () => void;
  onAddMovement: () => void;
  onAddLoan: () => void;
}

export function BalanceCard({ currentOwing, currentOwed, owingCount, owedCount, totalExpenses, memberCount, onViewBalance, onAddMovement, onAddLoan }: BalanceCardProps) {
  return (
    <>
      <section className="rounded-[30px] border border-[#dcd6ff] bg-[#ebe8ff] p-6" aria-label="Balance personal">
        <p className="text-sm font-semibold text-[#5144d8]">Tus deudas por gasto</p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-[#5f588c]">Debés · {owingCount} {owingCount === 1 ? 'deuda' : 'deudas'}</p>
            <p className="mt-1 text-2xl font-bold leading-none tracking-[-0.045em] tabular-nums text-[#493dd0]">{formatARS(currentOwing)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#5f588c]">Te deben · {owedCount} {owedCount === 1 ? 'deuda' : 'deudas'}</p>
            <p className="mt-1 text-2xl font-bold leading-none tracking-[-0.045em] tabular-nums text-[#493dd0]">{formatARS(currentOwed)}</p>
          </div>
        </div>
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
        <button type="button" onClick={onAddMovement} className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#594ff4] px-4 text-sm font-bold text-white transition active:scale-[0.98]">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          Agregar gasto
        </button>
        <button type="button" onClick={onAddLoan} className="flex min-h-14 items-center justify-center gap-2 rounded-full border border-[#b0b0b0] bg-white px-4 text-sm font-bold text-[#1f1f1f] transition active:scale-[0.98]">
          <span aria-hidden="true">💸</span>
          Préstamo rápido
        </button>
      </div>
      <button type="button" onClick={onViewBalance} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-bold text-[#594ff4] transition active:scale-[0.98]">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          Ver balance
      </button>
    </>
  );
}
