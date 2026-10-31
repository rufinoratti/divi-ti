'use client';

import { formatARS } from '@/lib/utils';
import { ArrowDownLeftIcon, ArrowRightIcon, ArrowUpRightIcon, HandCoinsIcon, PlusIcon } from 'lucide-react';

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
      <section className="overflow-hidden rounded-[24px] border border-[#dcd6ff] bg-[#ebe8ff] p-5 sm:p-6" aria-label="Balance personal">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#5144d8]">Tu balance por gasto</p>
            <p className="mt-1 text-sm text-[#5f588c]">Con {memberCount} {memberCount === 1 ? 'integrante' : 'integrantes'}</p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/75 text-brand">
            <ArrowRightIcon aria-hidden="true" size={19} strokeWidth={1.9} />
          </span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
          <div className="rounded-2xl border border-white/80 bg-white/70 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-copy-muted">
              <ArrowUpRightIcon aria-hidden="true" size={15} className="text-danger" />
              Debés <span className="text-copy-muted">· {owingCount}</span>
            </p>
            <p className="mt-2 min-w-0 break-words text-[clamp(.875rem,3.75vw,1.2rem)] font-bold leading-tight tracking-[-0.04em] tabular-nums text-ink">{formatARS(currentOwing)}</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/70 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-copy-muted">
              <ArrowDownLeftIcon aria-hidden="true" size={15} className="text-success" />
              Te deben <span className="text-copy-muted">· {owedCount}</span>
            </p>
            <p className="mt-2 min-w-0 break-words text-[clamp(.875rem,3.75vw,1.2rem)] font-bold leading-tight tracking-[-0.04em] tabular-nums text-ink">{formatARS(currentOwed)}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#d4cefa] pt-4 text-xs">
          <span className="text-[#5f588c]">Gastos registrados</span>
          <span className="font-bold tabular-nums text-[#302a58]">{formatARS(totalExpenses)}</span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onAddMovement} className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-brand px-3 text-sm font-bold text-white transition duration-150 active:scale-[0.98]">
          <PlusIcon aria-hidden="true" size={18} strokeWidth={2.2} />
          Agregar gasto
        </button>
        <button type="button" onClick={onAddLoan} className="flex min-h-14 items-center justify-center gap-2 rounded-full border border-line bg-white px-3 text-sm font-bold text-ink transition duration-150 active:scale-[0.98]">
          <HandCoinsIcon aria-hidden="true" size={18} strokeWidth={1.9} />
          Préstamo
        </button>
      </div>
      <button type="button" onClick={onViewBalance} className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold text-brand transition active:scale-[0.98]">
        Ver balance detallado
        <ArrowRightIcon aria-hidden="true" size={16} />
      </button>
    </>
  );
}
