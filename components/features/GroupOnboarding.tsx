'use client';

import { useState, type FormEvent } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, CircleAlertIcon, CircleCheckIcon, PlusIcon, UsersRoundIcon } from 'lucide-react';
import { GroupJoinCode } from '@/components/features/GroupJoinCode';
import { OPEN_GROUP_ONCE_STORAGE_KEY } from '@/lib/group-state';

interface GroupOnboardingProps {
  onCancel?: () => void;
}

export function GroupOnboarding({ onCancel }: GroupOnboardingProps) {
  const [name, setName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdGroup, setCreatedGroup] = useState<{ id: string | null; name: string; code: string } | null>(null);

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
      const data = await response.json() as {
        group?: { id?: string; nombre?: string; codigo_union?: string };
        error?: { message?: string } | string;
      };

      if (!response.ok || !data.group?.codigo_union) {
        const message = typeof data.error === 'string' ? data.error : data.error?.message;
        setError(message ?? 'No pudimos crear el grupo y generar su código para unirse.');
        return;
      }

      setCreatedGroup({ id: data.group.id ?? null, name: data.group.nombre ?? name, code: data.group.codigo_union });
    } catch {
      setError('No pudimos conectarnos con el servicio. Probá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (createdGroup) {
    return (
      <main className="divi-page min-h-[100dvh] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-ink sm:px-7">
        <div className="mx-auto max-w-[500px]">
          <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
            <CircleCheckIcon aria-hidden="true" size={24} strokeWidth={1.8} />
          </div>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.12em] text-brand">Grupo creado</p>
          <h1 className="mt-2 divi-page-title">Ya pueden sumarse a {createdGroup.name}</h1>
          <p className="mt-2 text-sm leading-6 text-copy-muted">Compartí este código con las personas de tu grupo.</p>

          <GroupJoinCode code={createdGroup.code} groupName={createdGroup.name} />

          <button
            type="button"
            onClick={() => {
              if (createdGroup.id) {
                try {
                  window.sessionStorage.setItem(OPEN_GROUP_ONCE_STORAGE_KEY, createdGroup.id);
                } catch {}
              }
              window.location.assign('/');
            }}
            className="mt-6 flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-white transition active:scale-[0.98]"
          >
            Ir al grupo
            <ArrowRightIcon aria-hidden="true" size={17} />
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="divi-page min-h-[100dvh] text-ink">
      <div className="mx-auto max-w-[500px] px-5 py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-7">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-copy-muted transition active:scale-[0.98]"
          >
            <ArrowLeftIcon aria-hidden="true" size={16} />
            Volver al inicio
          </button>
        )}
        <div className="mt-8 space-y-7">
          <div>
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
              <UsersRoundIcon aria-hidden="true" size={23} strokeWidth={1.8} />
            </span>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.12em] text-brand">Primer paso</p>
            <h1 className="mt-2 divi-page-title">Creá tu primer grupo</h1>
            <p className="mt-2 text-sm leading-6 text-copy-muted">Después vas a poder sumar a las personas con las que compartís gastos.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-[24px] border border-line bg-white p-5 shadow-[0_8px_28px_rgba(31,31,31,0.035)] sm:p-6">
            <div>
              <label htmlFor="group-name" className="block text-sm font-semibold text-ink">Nombre del grupo</label>
              <input id="group-name" name="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Casa Malbec" required minLength={2} maxLength={80} className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface/50 px-4 text-sm outline-none transition placeholder:text-copy-muted focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10" />
            </div>

            <div>
              <label htmlFor="member-name" className="block text-sm font-semibold text-ink">Tu nombre en el grupo <span className="font-normal text-copy-muted">(opcional)</span></label>
              <input id="member-name" name="memberName" autoComplete="name" value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Ej. Martina" maxLength={80} className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface/50 px-4 text-sm outline-none transition placeholder:text-copy-muted focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10" />
            </div>

            {error && <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#fef4f4] px-3 py-2 text-sm font-medium text-danger"><CircleAlertIcon aria-hidden="true" className="mt-0.5 shrink-0" size={16} />{error}</p>}

            <button type="submit" disabled={isSubmitting} className="mt-2 flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-50">
              {isSubmitting ? <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white motion-reduce:animate-none" aria-hidden="true" /> : <PlusIcon aria-hidden="true" size={17} />}
              {isSubmitting ? 'Creando grupo…' : 'Crear grupo'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
