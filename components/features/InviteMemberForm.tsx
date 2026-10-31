'use client';

import { Copy, Envelope, LinkSimple } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';

import { Icon } from '@/components/ui/icon';

interface InviteMemberFormProps {
  groupId: string;
}

export function InviteMemberForm({ groupId }: InviteMemberFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setInviteUrl('');
    setIsCopied(false);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, email, name: name || undefined }),
      });
      const data = await response.json() as {
        invitation?: { inviteUrl?: string };
        error?: { message?: string };
      };

      if (!response.ok || !data.invitation?.inviteUrl) {
        setError(data.error?.message ?? 'No pudimos crear la invitación.');
        return;
      }

      setInviteUrl(data.invitation.inviteUrl);
      setEmail('');
      setName('');
    } catch {
      setError('No pudimos conectarnos con Divi. Probá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1800);
    } catch {
      setError('No pudimos copiar el enlace. Seleccionalo y copialo manualmente.');
    }
  }

  return (
    <section className="mt-7 rounded-[var(--radius-panel)] border border-line p-6" aria-labelledby="invite-title">
      <Icon icon={LinkSimple} size="lg" className="text-brand" aria-hidden="true" />
      <h2 id="invite-title" className="mt-4 divi-section-title">Sumá a alguien al grupo</h2>
      <p className="mt-2 text-sm leading-6 text-copy-muted">Generá un enlace y compartilo con la persona que querés invitar.</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <label className="block text-sm font-medium text-copy-muted" htmlFor="invite-email">Email de la persona</label>
        <div className="flex items-center rounded-2xl border border-line px-3 focus-within:border-brand">
          <Icon icon={Envelope} size="md" className="text-subtle" aria-hidden="true" />
          <input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="persona@email.com"
            required
            className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-copy-muted"
          />
        </div>

        <label className="block text-sm font-medium text-copy-muted" htmlFor="invite-name">Nombre <span className="font-normal text-copy-muted">(opcional)</span></label>
        <input
          id="invite-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej. Tomás"
          className="h-12 w-full rounded-2xl border border-line bg-transparent px-3 text-sm outline-none placeholder:text-copy-muted focus:border-brand"
        />

        {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}

        <button type="submit" disabled={isSubmitting} className="flex min-h-12 w-full items-center justify-center rounded-full bg-brand px-4 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60">
          {isSubmitting ? 'Creando enlace...' : 'Crear enlace de invitación'}
        </button>
      </form>

      {inviteUrl && (
        <div className="mt-5 space-y-2">
          <label className="block text-sm font-medium text-copy-muted" htmlFor="invite-url">Enlace listo para compartir</label>
          <div className="flex items-center gap-2 rounded-2xl bg-surface p-2">
            <input id="invite-url" readOnly value={inviteUrl} className="min-w-0 flex-1 bg-transparent px-2 text-xs text-copy-muted outline-none" />
            <button type="button" onClick={handleCopy} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-white px-3 text-xs font-bold text-brand" aria-label="Copiar enlace de invitación">
              <Icon icon={Copy} size="sm" aria-hidden="true" />
              {isCopied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
