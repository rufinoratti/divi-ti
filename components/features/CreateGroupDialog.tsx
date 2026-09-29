'use client';

import { useState, type FormEvent } from 'react';
import { PlusIcon, XIcon } from 'lucide-react';

import { Field } from '@/components/layout/Field';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ACTIVE_GROUP_STORAGE_KEY } from '@/lib/group-state';

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setName('');
      setError('');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await response.json() as {
        group?: { id: string };
        error?: { message?: string } | string;
      };

      if (!response.ok || !data.group?.id) {
        const message = typeof data.error === 'string' ? data.error : data.error?.message;
        setError(message ?? 'No pudimos crear el grupo. Probá de nuevo.');
        return;
      }

      try {
        window.localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, data.group.id);
      } catch {}

      window.location.assign('/');
    } catch {
      setError('No pudimos conectarnos con Divi. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-7 rounded-[30px] border border-[#e7e7e7] p-6" aria-labelledby="create-group-title">
      <h2 id="create-group-title" className="text-xl font-bold tracking-[-0.035em]">Otro grupo, otro balance</h2>
      <p className="mt-2 text-sm leading-6 text-[#5d5d5d]">Separá los gastos de tus amistades, tu casa o un viaje.</p>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#594ff4] px-5 text-sm font-bold text-[#594ff4] transition active:scale-[0.98]"
        >
          <PlusIcon aria-hidden="true" size={17} />
          Crear otro grupo
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
              <DialogTitle className="text-2xl font-bold tracking-[-0.04em]">Crear grupo</DialogTitle>
              <DialogDescription className="mt-2 leading-6 text-[#5d5d5d]">
                Vas a poder invitar integrantes y cargar sus gastos por separado.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6">
              <Field label="Nombre del grupo" htmlFor="new-group-name">
                <input
                  id="new-group-name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. Casa Malbec"
                  required
                  minLength={2}
                  maxLength={80}
                  className="h-12 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 text-sm outline-none placeholder:text-[#888888] focus:border-[#594ff4]"
                />
              </Field>
            </div>

            {error && <p role="alert" className="mt-4 text-sm font-medium text-[#b42318]">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 flex min-h-13 w-full items-center justify-center rounded-full bg-[#594ff4] px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Creando grupo...' : 'Crear grupo'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
