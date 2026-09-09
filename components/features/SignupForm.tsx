'use client';

import { useState, type FormEvent } from 'react';
import { MailIcon, LockIcon, UserIcon } from 'lucide-react';
import { type AuthSessionPayload } from '@/lib/auth/types';

interface SignupFormProps {
  onSignup: (session: AuthSessionPayload) => Promise<void> | void;
  error?: string;
}

export function SignupForm({ onSignup, error }: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(error ?? '');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setSuccessMessage('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json() as {
        session?: AuthSessionPayload | null;
        message?: string;
        error?: { message?: string } | string;
      };

      if (!res.ok) {
        const message = typeof data.error === 'string' ? data.error : data.error?.message;
        setFormError(message ?? 'No pudimos crear la cuenta.');
        return;
      }

      if (!data.session) {
        setFormError(data.message ?? 'No se pudo iniciar la sesión automáticamente.');
        return;
      }

      await onSignup(data.session);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-white text-[#1f1f1f]">
      <div className="mx-auto max-w-[500px] px-5 py-12 sm:px-7">
        <div className="mt-8 space-y-7">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-[-0.045em]">Creá tu cuenta</h1>
            <p className="mt-2 text-[#5d5d5d]">Empezá a dividir gastos con tu grupo</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#5d5d5d]">Nombre</label>
              <div className="mt-1 flex items-center rounded-2xl border border-[#e7e7e7] bg-white focus-within:border-[#594ff4]">
                <UserIcon aria-hidden="true" className="pl-4 size-5 text-[#888888]" />
                <input id="name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" required className="h-12 w-full rounded-2xl bg-transparent px-2 text-sm outline-none placeholder:text-[#888888]" />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#5d5d5d]">Email</label>
              <div className="mt-1 flex items-center rounded-2xl border border-[#e7e7e7] bg-white focus-within:border-[#594ff4]">
                <MailIcon aria-hidden="true" className="pl-4 size-5 text-[#888888]" />
                <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required className="h-12 w-full rounded-2xl bg-transparent px-2 text-sm outline-none placeholder:text-[#888888]" />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#5d5d5d]">Contraseña</label>
              <div className="mt-1 flex items-center rounded-2xl border border-[#e7e7e7] bg-white focus-within:border-[#594ff4]">
                <LockIcon aria-hidden="true" className="pl-4 size-5 text-[#888888]" />
                <input id="password" name="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" required minLength={8} className="h-12 w-full rounded-2xl bg-transparent px-2 text-sm outline-none placeholder:text-[#888888]" />
              </div>
            </div>
            {formError && <p role="alert" className="text-sm font-medium text-[#b42318]">{formError}</p>}
            {successMessage && <p role="status" className="text-sm font-medium text-[#167c55]">{successMessage}</p>}
            <button type="submit" disabled={isSubmitting} className="mt-6 flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[#594ff4] px-5 text-sm font-bold text-white transition active:scale-[0.98] opacity-80 disabled:opacity-50">
              {isSubmitting ? 'Creando...' : 'Crear cuenta'}
            </button>
          </form>
          <p className="text-center text-sm text-[#5d5d5d]">
            Ya tenés cuenta?{' '}
            <a href="/login" className="font-bold text-[#594ff4]">Iniciá sesión</a>
          </p>
        </div>
      </div>
    </main>
  );
}
