'use client';

import { useState, type FormEvent } from 'react';
import { MailIcon } from 'lucide-react';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json() as {
        message?: string;
        error?: { message?: string } | string;
      };

      if (!response.ok) {
        const message = typeof data.error === 'string' ? data.error : data.error?.message;
        setError(message ?? 'No pudimos procesar la solicitud.');
        return;
      }

      setSuccessMessage(data.message ?? 'Revisá tu email para continuar.');
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
            <h1 className="text-3xl font-bold tracking-[-0.045em]">Recuperar contraseña</h1>
            <p className="mt-2 text-[#5d5d5d]">Te vamos a enviar un enlace para crear una nueva.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="recovery-email" className="block text-sm font-medium text-[#5d5d5d]">Email</label>
              <div className="mt-1 flex items-center rounded-2xl border border-[#e7e7e7] bg-white focus-within:border-[#594ff4]">
                <MailIcon aria-hidden="true" className="ml-4 size-5 text-[#888888]" />
                <input id="recovery-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" required className="h-12 w-full rounded-2xl bg-transparent px-2 text-sm outline-none placeholder:text-[#888888]" />
              </div>
            </div>

            {error && <p role="alert" className="text-sm font-medium text-[#b42318]">{error}</p>}
            {successMessage && <p role="status" className="text-sm font-medium text-[#167c55]">{successMessage}</p>}

            <button type="submit" disabled={isSubmitting} className="mt-6 flex min-h-13 w-full items-center justify-center rounded-full bg-[#594ff4] px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50">
              {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>

          <p className="text-center text-sm text-[#5d5d5d]"><a href="/login" className="font-bold text-[#594ff4]">Volver a iniciar sesión</a></p>
        </div>
      </div>
    </main>
  );
}
