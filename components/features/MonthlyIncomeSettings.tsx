'use client';

import { useEffect, useState, type FormEvent } from 'react';

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
    <section className="mt-7 rounded-[30px] border border-[#e7e7e7] p-6" aria-labelledby="income-title">
      <h2 id="income-title" className="text-xl font-bold tracking-[-0.035em]">Ingreso mensual opcional</h2>
      <p className="mt-2 text-sm leading-6 text-[#5d5d5d]">
        Solo se usa si elegís dividir un gasto proporcionalmente. Lo podés ver y cambiar únicamente desde tu cuenta.
      </p>
      <form onSubmit={saveIncome} className="mt-4 space-y-3">
        <label htmlFor="monthly-income" className="block text-sm font-medium text-[#5d5d5d]">Ingreso mensual (ARS)</label>
        <div className="flex h-12 items-center rounded-2xl border border-[#e7e7e7] bg-white focus-within:border-[#594ff4]">
          <span aria-hidden="true" className="pl-4 text-sm font-bold text-[#5d5d5d]">$</span>
          <input id="monthly-income" inputMode="decimal" value={income} onChange={(event) => setIncome(event.target.value)} disabled={isLoading || isSaving} placeholder="Dejalo vacío si no querés usarlo" className="h-full min-w-0 flex-1 rounded-2xl px-3 text-sm outline-none placeholder:text-xs placeholder:text-[#888888] disabled:opacity-60" />
          <span className="pr-4 text-xs text-[#888888]">ARS</span>
        </div>
        {error && <p role="alert" className="text-sm font-medium text-[#b42318]">{error}</p>}
        {notice && <p role="status" className="text-sm font-medium text-[#247446]">{notice}</p>}
        <button type="submit" disabled={isLoading || isSaving} className="min-h-11 w-full rounded-full border border-[#594ff4] px-4 text-sm font-bold text-[#594ff4] disabled:opacity-50">
          {isLoading ? 'Cargando…' : isSaving ? 'Guardando…' : 'Guardar ingreso'}
        </button>
      </form>
    </section>
  );
}
