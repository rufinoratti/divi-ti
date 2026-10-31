'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CheckIcon, CircleAlertIcon, LoaderCircleIcon } from 'lucide-react';

import { parseCurrencyAmount } from '@/lib/movement-draft';

export function MonthlyIncomeSettings() {
  const [income, setIncome] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/profile/income', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json() as { income?: number | null; error?: { message?: string } };
        if (!response.ok) throw new Error(data.error?.message ?? 'No pudimos leer tu ingreso.');
        if (!cancelled) setIncome(data.income == null ? '' : String(data.income).replace('.', ','));
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'No pudimos leer tu ingreso.');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function saveIncome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedIncome = income.trim() ? parseCurrencyAmount(income) : null;
    if (income.trim() && (!parsedIncome || parsedIncome <= 0)) {
      setError('Ingresá un ingreso mensual mayor a cero o dejá el campo vacío para borrarlo.');
      setNotice('');
      return;
    }

    setIsSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/profile/income', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ income: parsedIncome }),
      });
      const data = await response.json() as { income?: number | null; error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message ?? 'No pudimos guardar tu ingreso.');
      setIncome(data.income == null ? '' : String(data.income).replace('.', ','));
      setNotice(data.income == null ? 'Ingreso eliminado.' : 'Ingreso guardado en tu perfil privado.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos guardar tu ingreso.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-7 rounded-[24px] border border-line p-6" aria-labelledby="income-title">
      <h2 id="income-title" className="divi-section-title">Ingreso mensual opcional</h2>
      <p className="mt-2 text-sm leading-6 text-copy-muted">
        Solo se usa si elegís dividir un gasto proporcionalmente. Lo podés ver y cambiar únicamente desde tu cuenta.
      </p>
      <form onSubmit={saveIncome} className="mt-4 space-y-3" aria-busy={isLoading || isSaving}>
        {isLoading
          ? <p className="text-sm font-medium text-copy-muted">Ingreso mensual (ARS)</p>
          : <label htmlFor="monthly-income" className="block text-sm font-medium text-copy-muted">Ingreso mensual (ARS)</label>}
        {isLoading ? (
          <>
            <div className="space-y-3" aria-hidden="true">
              <div className="divi-skeleton h-12 rounded-2xl" />
              <div className="divi-skeleton h-11 rounded-full" />
            </div>
            <p role="status" className="sr-only">Cargando tu ingreso mensual…</p>
          </>
        ) : (
          <>
            <div className="flex h-12 items-center rounded-2xl border border-line bg-white transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
              <span aria-hidden="true" className="pl-4 text-sm font-bold text-copy-muted">$</span>
              <input id="monthly-income" inputMode="decimal" value={income} onChange={(event) => setIncome(event.target.value)} disabled={isSaving} placeholder="Dejalo vacío si no querés usarlo" className="h-full min-w-0 flex-1 rounded-2xl px-3 text-sm outline-none placeholder:text-xs placeholder:text-copy-muted disabled:opacity-60" />
              <span className="pr-4 text-xs text-copy-muted">ARS</span>
            </div>
            {error && <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#fef4f4] px-3 py-2 text-sm font-medium text-danger"><CircleAlertIcon aria-hidden="true" className="mt-0.5 shrink-0" size={16} />{error}</p>}
            {notice && <p role="status" className="flex items-center gap-2 rounded-xl bg-[#edf8f0] px-3 py-2 text-sm font-medium text-success"><CheckIcon aria-hidden="true" size={16} />{notice}</p>}
            <button type="submit" disabled={isSaving} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-brand px-4 text-sm font-bold text-brand transition active:scale-[0.98] disabled:opacity-50">
              {isSaving && <LoaderCircleIcon aria-hidden="true" size={16} className="animate-spin motion-reduce:animate-none" />}
              {isSaving ? 'Guardando…' : 'Guardar ingreso'}
            </button>
          </>
        )}
      </form>
    </section>
  );
}
