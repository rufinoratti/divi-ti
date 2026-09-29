'use client';

import { useId, useState, type FormEvent } from 'react';
import { KeyRoundIcon, XIcon } from 'lucide-react';

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ACTIVE_GROUP_STORAGE_KEY } from '@/lib/group-state';

interface JoinGroupDialogProps {
  compact?: boolean;
}

export function JoinGroupDialog({ compact = false }: JoinGroupDialogProps) {
  const codeFieldId = `join-group-code-${useId()}`;
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setCode('');
      setError('');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json() as {
        membership?: { group?: { id: string } };
        error?: { message?: string } | string;
      };

      const groupId = data.membership?.group?.id;
      if (!response.ok || !groupId) {
        const message = typeof data.error === 'string' ? data.error : data.error?.message;
        setError(message ?? 'No pudimos encontrar ese grupo. Revisá el código e intentá de nuevo.');
        return;
      }

      try {
        window.localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, groupId);
      } catch {}

      window.location.assign('/');
    } catch {
      setError('No pudimos conectarnos con Divi. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        className={compact
          ? 'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#e7e7e7] px-5 text-sm font-bold text-[#1f1f1f] transition active:scale-[0.98]'
          : 'mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#e7e7e7] px-5 text-sm font-bold text-[#1f1f1f] transition active:scale-[0.98]'}
      >
        <KeyRoundIcon aria-hidden="true" size={17} />
        Unirme con un código
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="max-w-[calc(100%-2rem)] rounded-[28px] bg-white p-6 sm:max-w-md">
        <DialogClose
          aria-label="Cerrar"
          className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-[#f6f6f6] text-[#1f1f1f]"
        >
          <XIcon aria-hidden="true" size={18} />
          <span className="sr-only">Cerrar</span>
        </DialogClose>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-[-0.04em]">Unite a un grupo</DialogTitle>
            <DialogDescription className="mt-2 leading-6 text-[#5d5d5d]">
              Ingresá el código de 12 caracteres que te compartieron.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6">
            <label htmlFor={codeFieldId} className="block text-sm font-medium text-[#5d5d5d]">Código del grupo</label>
            <input
              id={codeFieldId}
              name="code"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={32}
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 12))}
              placeholder="A3F9C821B70D"
              aria-describedby={`${codeFieldId}-hint`}
              required
              className="mt-1 h-14 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 font-mono text-lg font-bold tracking-[0.12em] outline-none placeholder:text-sm placeholder:font-normal placeholder:tracking-normal focus:border-[#594ff4]"
            />
            <p id={`${codeFieldId}-hint`} className="mt-2 text-xs leading-5 text-[#888888]">
              Usá números del 0 al 9 y letras de la A a la F.
            </p>
          </div>

          {error && <p role="alert" className="mt-4 text-sm font-medium text-[#b42318]">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || code.length !== 12}
            className="mt-6 flex min-h-13 w-full items-center justify-center rounded-full bg-[#594ff4] px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Buscando grupo...' : 'Unirme al grupo'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
