'use client';

import { ArrowRightIcon, CheckIcon, Link2Icon, LogOutIcon, PlusIcon, UsersRoundIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useAuth } from '@/hooks/useAuth';

interface EmptyGroupsHomeProps {
  email: string | null;
  onCreateGroup: () => void;
}

function parseJoinInput(value: string) {
  const input = value.trim();
  const normalizedCode = input.toUpperCase().replace(/[\s-]/g, '');
  if (/^[A-F0-9]{12}$/.test(normalizedCode)) {
    return { kind: 'code' as const, value: normalizedCode };
  }

  try {
    const url = new URL(input, window.location.origin);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

    const match = url.pathname.match(/^\/invite\/([^/]+)\/?$/);
    if (!match) return null;

    const token = decodeURIComponent(match[1]);
    return token.length >= 20 && token.length <= 200
      ? { kind: 'invitation' as const, value: token }
      : null;
  } catch {
    return null;
  }
}

export function EmptyGroupsHome({ email, onCreateGroup }: EmptyGroupsHomeProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const [invitationLink, setInvitationLink] = useState('');
  const [invitationError, setInvitationError] = useState('');
  const [invitationSuccess, setInvitationSuccess] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  async function handleJoinGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInvitationError('');
    setInvitationSuccess('');

    const joinInput = parseJoinInput(invitationLink);
    if (!joinInput) {
      setInvitationError('Pegá un código de grupo válido o un enlace de invitación.');
      return;
    }

    setIsJoining(true);

    try {
      const response = await fetch(joinInput.kind === 'code' ? '/api/groups/join' : '/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(joinInput.kind === 'code' ? { code: joinInput.value } : { token: joinInput.value }),
      });
      const data = await response.json() as {
        message?: string;
        alreadyAccepted?: boolean;
        error?: { message?: string } | string;
      };

      if (!response.ok) {
        const errorMessage = typeof data.error === 'string' ? data.error : data.error?.message;
        setInvitationError(errorMessage ?? 'No pudimos aceptar la invitación. Revisá el enlace e intentá de nuevo.');
        return;
      }

      setInvitationSuccess(data.message ?? (data.alreadyAccepted
        ? 'Ya pertenecés a este grupo.'
        : 'Te sumaste al grupo. Abriendo Divi…'));
      window.setTimeout(() => window.location.assign('/'), 500);
    } catch {
      setInvitationError('No pudimos conectarnos con Divi. Revisá tu conexión y probá de nuevo.');
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <main className="divi-page">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[500px] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-ink sm:px-7">
        <header className="flex items-center justify-between">
          <img src="/branding/divi-lockup.png" alt="Divi" className="h-9 w-auto object-contain" />
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-copy-muted transition active:scale-[0.97]"
          >
            <LogOutIcon aria-hidden="true" size={17} strokeWidth={1.8} />
            Salir
          </button>
        </header>

        <section className="mt-12" aria-labelledby="empty-groups-title">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-brand">Tu espacio compartido</p>
          <h1 className="divi-page-title mt-2">Bienvenido a Divi</h1>
          <p className="mt-2 text-sm leading-6 text-copy-muted">Organizá los gastos con las personas con las que compartís.</p>

          <div className="mt-7 rounded-[24px] border border-line bg-white p-5 shadow-[0_8px_28px_rgba(31,31,31,0.035)] sm:p-7">
            <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
              <UsersRoundIcon aria-hidden="true" size={23} strokeWidth={1.8} />
            </div>
            <h2 id="empty-groups-title" className="mt-4 divi-section-title text-xl">
              Empezá con un grupo
            </h2>
            <p className="mt-2 text-sm leading-6 text-copy-muted">
              {email ? <>Iniciaste sesión como <span className="font-semibold text-ink">{email}</span>. </> : ''}
              Creá un grupo nuevo o sumate con la invitación que te compartieron.
            </p>

            <form onSubmit={handleJoinGroup} className="mt-6 space-y-3">
              <label htmlFor="invitation-link" className="flex items-center gap-2 text-sm font-bold text-ink">
                <Link2Icon aria-hidden="true" size={16} className="text-brand" />
                ¿Ya tenés una invitación?
              </label>
              <p className="-mt-1 text-xs leading-5 text-copy-muted">
                Pegá el código o enlace y te sumamos directamente.
              </p>
              <input
                id="invitation-link"
                name="invitationLink"
                type="text"
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                value={invitationLink}
                onChange={(event) => {
                  setInvitationLink(event.target.value);
                  setInvitationError('');
                  setInvitationSuccess('');
                }}
                placeholder="ABCDEF-123456 o enlace de invitación"
                required
                aria-invalid={Boolean(invitationError)}
                aria-describedby={invitationError ? 'invitation-link-error' : undefined}
                className="h-12 w-full rounded-2xl border border-line bg-surface/50 px-4 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10 placeholder:text-copy-muted"
              />
              {invitationError && <p id="invitation-link-error" role="alert" className="rounded-xl bg-[#fef4f4] px-3 py-2 text-sm font-medium text-danger">{invitationError}</p>}
              {invitationSuccess && <p role="status" className="flex items-start gap-2 rounded-xl bg-[#edf8f0] px-3 py-2 text-sm font-medium text-success"><CheckIcon aria-hidden="true" className="mt-0.5 shrink-0" size={16} />{invitationSuccess}</p>}
              <button
                type="submit"
                disabled={isJoining}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
              >
                {isJoining ? 'Uniéndote al grupo…' : 'Unirme al grupo'}
                {!isJoining && <ArrowRightIcon aria-hidden="true" size={17} />}
              </button>
            </form>

            <div className="mt-6 border-t border-line pt-5">
              <p className="text-sm leading-5 text-copy-muted">¿Preferís empezar uno nuevo?</p>
              <button
                type="button"
                onClick={onCreateGroup}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-line px-5 text-sm font-bold text-ink transition active:scale-[0.98]"
              >
                <PlusIcon aria-hidden="true" size={17} className="text-brand" />
                Crear grupo
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
