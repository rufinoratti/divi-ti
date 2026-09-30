'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

import { AuthLoading } from '@/components/layout/AuthLoading';
import { useAuth } from '@/hooks/useAuth';
import { OPEN_GROUP_ONCE_STORAGE_KEY } from '@/lib/group-state';

type InviteStatus = 'waiting' | 'login' | 'accepting' | 'success' | 'error';

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const { isAuthenticated, isLoading } = useAuth();
  const attemptedToken = useRef('');
  const [status, setStatus] = useState<InviteStatus>('waiting');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isLoading || !token) return;

    if (!isAuthenticated) {
      setStatus('login');
      return;
    }

    if (attemptedToken.current === token) return;
    attemptedToken.current = token;
    setStatus('accepting');

    fetch('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json() as {
          message?: string;
          member?: { grupo_id?: string };
          error?: { message?: string };
        };
        if (!response.ok) throw new Error(data.error?.message ?? 'No pudimos aceptar la invitación.');
        if (data.member?.grupo_id) {
          try {
            window.sessionStorage.setItem(OPEN_GROUP_ONCE_STORAGE_KEY, data.member.grupo_id);
          } catch {}
        }
        setMessage(data.message ?? 'Te sumaste al grupo correctamente.');
        setStatus('success');
        window.setTimeout(() => window.location.assign('/'), 700);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : 'No pudimos aceptar la invitación.');
        setStatus('error');
      });
  }, [isAuthenticated, isLoading, token]);

  if (isLoading || status === 'waiting' || status === 'accepting') return <AuthLoading />;

  const nextPath = `/invite/${encodeURIComponent(token)}`;

  if (status === 'login') {
    return (
      <main className="min-h-[100dvh] bg-white px-5 py-12 text-[#1f1f1f]">
        <div className="mx-auto max-w-[500px] space-y-6 text-center">
          <img src="/branding/divi-lockup.png" alt="Divi" className="mx-auto h-10 w-auto object-contain" />
          <div>
            <h1 className="text-3xl font-bold tracking-[-0.05em]">Te invitaron a un grupo</h1>
            <p className="mt-3 text-[#5d5d5d]">Iniciá sesión o creá tu cuenta para sumarte.</p>
          </div>
          <div className="grid gap-3">
            <a href={`/login?next=${encodeURIComponent(nextPath)}`} className="flex min-h-13 items-center justify-center rounded-full bg-[#594ff4] px-5 text-sm font-bold text-white">
              Iniciar sesión
            </a>
            <a href={`/signup?next=${encodeURIComponent(nextPath)}`} className="flex min-h-13 items-center justify-center rounded-full border border-[#e7e7e7] px-5 text-sm font-bold text-[#1f1f1f]">
              Crear cuenta
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-white px-5 py-12 text-[#1f1f1f]">
      <div className="mx-auto max-w-[500px] space-y-5 text-center">
        <img src="/branding/divi-lockup.png" alt="Divi" className="mx-auto h-10 w-auto object-contain" />
        <h1 className="text-3xl font-bold tracking-[-0.05em]">{status === 'success' ? 'Bienvenido al grupo' : 'No pudimos aceptar la invitación'}</h1>
        <p className="text-[#5d5d5d]">{message}</p>
        <a href="/" className="inline-flex min-h-13 items-center justify-center rounded-full bg-[#594ff4] px-5 text-sm font-bold text-white">
          Volver a Divi
        </a>
      </div>
    </main>
  );
}
