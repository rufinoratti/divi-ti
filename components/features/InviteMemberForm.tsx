'use client';

import { CopyIcon, LinkIcon, MailIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';

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
    <section className="mt-7 rounded-[30px] border border-[#e7e7e7] p-6" aria-labelledby="invite-title">
      <LinkIcon aria-hidden="true" size={23} className="text-[#594ff4]" strokeWidth={1.8} />
      <h2 id="invite-title" className="mt-4 text-xl font-bold tracking-[-0.035em]">Sumá a alguien al grupo</h2>
      <p className="mt-2 text-sm leading-6 text-[#5d5d5d]">Generá un enlace y compartilo con la persona que querés invitar.</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <label className="block text-sm font-medium text-[#5d5d5d]" htmlFor="invite-email">Email de la persona</label>
        <div className="flex items-center rounded-2xl border border-[#e7e7e7] px-3 focus-within:border-[#594ff4]">
          <MailIcon aria-hidden="true" size={17} className="text-[#888888]" />
          <input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="persona@email.com"
            required
            className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[#888888]"
          />
        </div>

        <label className="block text-sm font-medium text-[#5d5d5d]" htmlFor="invite-name">Nombre <span className="font-normal text-[#888888]">(opcional)</span></label>
        <input
          id="invite-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej. Tomás"
          className="h-12 w-full rounded-2xl border border-[#e7e7e7] bg-transparent px-3 text-sm outline-none placeholder:text-[#888888] focus:border-[#594ff4]"
        />

        {error && <p role="alert" className="text-sm font-medium text-[#b42318]">{error}</p>}

        <button type="submit" disabled={isSubmitting} className="flex min-h-12 w-full items-center justify-center rounded-full bg-[#594ff4] px-4 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60">
          {isSubmitting ? 'Creando enlace...' : 'Crear enlace de invitación'}
        </button>
      </form>

      {inviteUrl && (
        <div className="mt-5 space-y-2">
          <label className="block text-sm font-medium text-[#5d5d5d]" htmlFor="invite-url">Enlace listo para compartir</label>
          <div className="flex items-center gap-2 rounded-2xl bg-[#f6f6f6] p-2">
            <input id="invite-url" readOnly value={inviteUrl} className="min-w-0 flex-1 bg-transparent px-2 text-xs text-[#5d5d5d] outline-none" />
            <button type="button" onClick={handleCopy} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-white px-3 text-xs font-bold text-[#594ff4]" aria-label="Copiar enlace de invitación">
              <CopyIcon aria-hidden="true" size={15} />
              {isCopied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
