'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

import { AccessBrand, AccessWave } from '@/components/features/AuthPageFrame';
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
      <main className="access-page">
        <div className="access-shell access-shell-single">
          <section className="access-hero">
            <div className="access-hero-inner">
              <AccessBrand tone="light" />
              <header className="access-hero-mobile access-hero-always">
                <h1>Te invitaron a un grupo</h1>
                <p>Iniciá sesión o creá tu cuenta para sumarte.</p>
              </header>
            </div>
            <AccessWave className="access-wave access-wave-bottom" />
          </section>
          <section className="access-sheet access-sheet-actions">
            <div className="access-actions">
              <a href={`/login?next=${encodeURIComponent(nextPath)}`} className="access-primary access-primary-on-sheet">Iniciar sesión</a>
              <a href={`/signup?next=${encodeURIComponent(nextPath)}`} className="access-secondary">Crear cuenta</a>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="access-page">
      <div className="access-shell access-shell-single">
        <section className="access-hero">
          <div className="access-hero-inner">
            <AccessBrand tone="light" />
            <header className="access-hero-mobile access-hero-always">
              <h1>{status === 'success' ? 'Bienvenido al grupo' : 'No pudimos aceptar la invitación'}</h1>
              <p>{message}</p>
            </header>
          </div>
          <AccessWave className="access-wave access-wave-bottom" />
        </section>
        <section className="access-sheet access-sheet-actions">
          <a href="/" className="access-primary access-primary-on-sheet">Volver a Divi</a>
        </section>
      </div>
    </main>
  );
}
