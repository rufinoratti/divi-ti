'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { XIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/layout/Field';
import { type Member, type MovementKind, type MovementCategory, type LedgerMovement } from '@/lib/ledger';

interface MovementComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  currentMemberId: string;
  editingMovement?: LedgerMovement | null;
  onSubmit: (movement: LedgerMovement) => Promise<void> | void;
}

const categoryOptions: MovementCategory[] = ['Comida', 'Compras', 'Transporte', 'Alquiler', 'Otros'];

export function MovementComposer({ open, onOpenChange, members, currentMemberId, editingMovement, onSubmit }: MovementComposerProps) {
  const [kind, setKind] = useState<MovementKind>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState(currentMemberId);
  const [recipient, setRecipient] = useState('');
  const [category, setCategory] = useState<MovementCategory>('Comida');
  const [participants, setParticipants] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (editingMovement) {
      setKind(editingMovement.kind);
      setDescription(editingMovement.description);
      setAmount(String(editingMovement.amount).replace('.', ','));
      setPayer(editingMovement.paidBy);
      setRecipient(editingMovement.recipient ?? '');
      setCategory(editingMovement.category);
      setParticipants(editingMovement.participants);
      setFormError('');
      return;
    }

    setKind('expense');
    setDescription('');
    setAmount('');
    setPayer(currentMemberId);
    setRecipient(members.find((member) => member.id !== currentMemberId)?.id ?? '');
    setCategory('Comida');
    setParticipants(members.map((member) => member.id));
    setFormError('');
  }, [currentMemberId, editingMovement, members, open]);

  function resetComposer() {
    setKind('expense');
    setDescription('');
    setAmount('');
    setPayer(currentMemberId);
    setRecipient(members.find((member) => member.id !== currentMemberId)?.id ?? '');
    setCategory('Comida');
    setParticipants(members.map((member) => member.id));
    setFormError('');
    setIsSubmitting(false);
  }

  function closeComposer() { onOpenChange(false); resetComposer(); }

  function toggleParticipant(memberId: string) {
    setParticipants((current) => current.includes(memberId)
      ? current.filter((id) => id !== memberId)
      : [...current, memberId]);
    setFormError('');
  }

  async function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const parsedAmount = Number(amount.replace(',', '.'));

    if (!description.trim()) {
      setFormError('Contanos qué gasto fue para que el grupo lo reconozca.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('Ingresá un importe mayor a cero.');
      return;
    }

    if (kind === 'expense' && participants.length === 0) {
      setFormError('Elegí al menos una persona para repartir este gasto.');
      return;
    }

    if (kind === 'loan' && (!recipient || recipient === payer)) {
      setFormError('Elegí una persona distinta a quien presta el dinero.');
      return;
    }

    const movement: LedgerMovement = {
      id: editingMovement?.id ?? `movement-${Date.now()}`,
      kind,
      description: description.trim(),
      amount: parsedAmount,
      paidBy: payer,
      recipient: kind === 'loan' ? recipient : undefined,
      category: kind === 'loan' ? 'Préstamo' : category,
      participants: kind === 'expense' ? participants : [],
      createdAt: new Date().toISOString(),
    };

    setFormError('');
    setIsSubmitting(true);

    try {
      await onSubmit(movement);
      closeComposer();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No pudimos guardar el movimiento. Probá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) closeComposer(); }}>
      <DialogContent showCloseButton={false} className="max-w-[calc(100%-2rem)] rounded-[28px] bg-white p-6 sm:max-w-md">
        <form onSubmit={submitMovement}>
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
              <DialogTitle className="text-2xl font-bold tracking-[-0.04em]">{editingMovement ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
              <DialogDescription className="mt-2 leading-6 text-[#5d5d5d]">{editingMovement ? 'Actualizá los datos y recalculamos el balance.' : 'Registralo ahora. El balance se recalcula al guardar.'}</DialogDescription>
              </div>
              <button type="button" onClick={closeComposer} aria-label="Cerrar" className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f6f6f6] text-[#1f1f1f] active:scale-[0.96]"><XIcon aria-hidden="true" size={18} /></button>
            </div>
          </DialogHeader>
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-[#f6f6f6] p-1.5">
            {[
              { id: 'expense' as const, label: 'Gasto grupal' },
              { id: 'loan' as const, label: 'Préstamo' },
            ].map((option) => (
              <button key={option.id} type="button" onClick={() => { setKind(option.id); setFormError(''); }} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition active:scale-[0.98] ${kind === option.id ? 'bg-white text-[#594ff4]' : 'text-[#5d5d5d]'}`}>{option.id === 'expense' ? '📄' : '💰'} {option.label}</button>
            ))}
          </div>
          <div className="mt-6 space-y-4">
            <Field label="Descripción" htmlFor="description"><input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={kind === 'expense' ? 'Ej. compra del súper' : 'Ej. taxi de vuelta'} className="h-12 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 text-sm outline-none placeholder:text-[#888888] focus:border-[#594ff4]" /></Field>
            <Field label="Importe" htmlFor="amount"><div className="flex h-12 items-center rounded-2xl border border-[#e7e7e7] bg-white focus-within:border-[#594ff4]"><span className="pl-4 text-sm font-bold text-[#5d5d5d]">$</span><input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="h-full min-w-0 flex-1 rounded-2xl px-2 text-sm font-bold outline-none placeholder:text-[#888888]" /><span className="pr-4 text-xs font-medium text-[#888888]">ARS</span></div></Field>
            <Field label={kind === 'loan' ? 'Presta' : 'Pagó'} htmlFor="payer"><select id="payer" value={payer} onChange={(e) => setPayer(e.target.value)} className="h-12 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 text-sm outline-none focus:border-[#594ff4]">{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
            {kind === 'loan' ? (
              <Field label="Recibe" htmlFor="recipient"><select id="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} className="h-12 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 text-sm outline-none focus:border-[#594ff4]">{members.filter((m) => m.id !== payer).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
            ) : (
              <>
                <Field label="Categoría" htmlFor="category"><select id="category" value={category} onChange={(e) => setCategory(e.target.value as MovementCategory)} className="h-12 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 text-sm outline-none focus:border-[#594ff4]">{categoryOptions.map((o) => <option key={o}>{o}</option>)}</select></Field>
                <fieldset className="rounded-2xl border border-[#e7e7e7] p-4">
                  <legend className="px-1 text-sm font-bold">Participan del gasto</legend>
                  <div className="mt-3 space-y-2">
                    {members.map((member) => {
                      const selected = participants.includes(member.id);
                      return (
                        <label key={member.id} className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${selected ? 'bg-[#f0efff] text-[#594ff4]' : 'bg-[#f6f6f6] text-[#5d5d5d]'}`}>
                          <span className="flex items-center gap-2 font-medium">
                            <input type="checkbox" checked={selected} onChange={() => toggleParticipant(member.id)} className="size-4 accent-[#594ff4]" />
                            {member.name}
                          </span>
                          {member.id === payer && <span className="text-xs font-bold">Pagó</span>}
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#5d5d5d]">Se reparte en partes iguales entre las {participants.length} personas seleccionadas.</p>
                </fieldset>
              </>
            )}
          </div>
          {formError && <p role="alert" className="mt-4 text-sm font-medium text-[#b42318]">{formError}</p>}
          <button type="submit" disabled={isSubmitting} className="mt-6 flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[#594ff4] px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70">
            {isSubmitting ? <><span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> {editingMovement ? 'Actualizando movimiento...' : 'Guardando movimiento...'}</> : <><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> {editingMovement ? 'Actualizar movimiento' : 'Guardar movimiento'}</>}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
