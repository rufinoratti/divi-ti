'use client';

import { LogOutIcon, UsersRoundIcon } from 'lucide-react';
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
    <main className="min-h-[100dvh] bg-white px-5 pb-10 pt-6 text-[#1f1f1f] sm:px-7">
      <div className="mx-auto max-w-[500px]">
        <header className="flex items-center justify-between">
          <img src="/branding/divi-lockup.png" alt="Divi" className="h-9 w-auto object-contain" />
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-[#5d5d5d] transition hover:bg-[#f6f6f6] active:scale-[0.97]"
          >
            <LogOutIcon aria-hidden="true" size={17} strokeWidth={1.8} />
            Salir
          </button>
        </header>

        <section className="mt-16" aria-labelledby="empty-groups-title">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#594ff4]">Inicio</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.05em]">Bienvenido a Divi</h1>

          <div className="mt-8 rounded-[30px] border border-[#e7e7e7] bg-white p-6 sm:p-8">
            <div className="grid size-12 place-items-center rounded-2xl bg-[#f1f0ff] text-[#594ff4]">
              <UsersRoundIcon aria-hidden="true" size={23} strokeWidth={1.8} />
            </div>
            <h2 id="empty-groups-title" className="mt-5 text-2xl font-bold tracking-[-0.04em]">
              Todavía no hay grupos
            </h2>
            <p className="mt-2 text-[15px] leading-6 text-[#5d5d5d]">
              {email ? `Iniciaste sesión como ${email}. ` : ''}
              Cuando crees un grupo o aceptes una invitación, va a aparecer acá.
            </p>

            <form onSubmit={handleJoinGroup} className="mt-6 space-y-3">
              <label htmlFor="invitation-link" className="block text-sm font-semibold text-[#1f1f1f]">
                ¿Te invitaron a un grupo? Pegá el código o enlace acá.
              </label>
              <p className="-mt-1 text-sm leading-5 text-[#5d5d5d]">
                El código o enlace te suma directamente al grupo al que te invitaron.
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
                className="h-12 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 text-sm outline-none placeholder:text-[#888888] focus:border-[#594ff4]"
              />
              {invitationError && <p id="invitation-link-error" role="alert" className="text-sm font-medium text-[#b42318]">{invitationError}</p>}
              {invitationSuccess && <p role="status" className="text-sm font-medium text-[#247446]">{invitationSuccess}</p>}
              <button
                type="submit"
                disabled={isJoining}
                className="flex min-h-12 w-full items-center justify-center rounded-full bg-[#594ff4] px-5 text-sm font-bold text-white transition hover:bg-[#4c42e8] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
              >
                {isJoining ? 'Uniéndote al grupo…' : 'Unirme al grupo'}
              </button>
            </form>

            <div className="mt-6 border-t border-[#e7e7e7] pt-5">
              <p className="text-sm leading-5 text-[#5d5d5d]">¿Preferís empezar uno nuevo?</p>
              <button
                type="button"
                onClick={onCreateGroup}
                className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full border border-[#e7e7e7] px-5 text-sm font-bold text-[#1f1f1f] transition hover:bg-[#f6f6f6] active:scale-[0.98]"
              >
                Crear grupo
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
