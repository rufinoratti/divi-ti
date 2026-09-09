'use client';

import { useState, type FormEvent } from 'react';

export function GroupOnboarding() {
  const [name, setName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, memberName: memberName || undefined }),
      });
      const data = await response.json() as { error?: { message?: string } | string };

      if (!response.ok) {
        const message = typeof data.error === 'string' ? data.error : data.error?.message;
        setError(message ?? 'No pudimos crear el grupo.');
        return;
      }

      window.location.assign('/');
    } catch {
      setError('No pudimos conectarnos con el servicio. Probá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-white text-[#1f1f1f]">
      <div className="mx-auto max-w-[500px] px-5 py-12 sm:px-7">
        <div className="mt-8 space-y-7">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#594ff4]">Primer paso</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.045em]">Creá tu primer grupo</h1>
            <p className="mt-2 text-[#5d5d5d]">Después vas a poder sumar a las personas con las que compartís gastos.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="group-name" className="block text-sm font-medium text-[#5d5d5d]">Nombre del grupo</label>
              <input id="group-name" name="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Casa Malbec" required minLength={2} maxLength={80} className="mt-1 h-12 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 text-sm outline-none placeholder:text-[#888888] focus:border-[#594ff4]" />
            </div>

            <div>
              <label htmlFor="member-name" className="block text-sm font-medium text-[#5d5d5d]">Tu nombre en el grupo <span className="font-normal text-[#888888]">(opcional)</span></label>
              <input id="member-name" name="memberName" autoComplete="name" value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Ej. Martina" maxLength={80} className="mt-1 h-12 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 text-sm outline-none placeholder:text-[#888888] focus:border-[#594ff4]" />
            </div>

            {error && <p role="alert" className="text-sm font-medium text-[#b42318]">{error}</p>}

            <button type="submit" disabled={isSubmitting} className="mt-4 flex min-h-13 w-full items-center justify-center rounded-full bg-[#594ff4] px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50">
              {isSubmitting ? 'Creando grupo...' : 'Crear grupo'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
