'use client';

import { useState, type FormEvent } from 'react';
import { XIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/layout/Field';
import { roundCurrency, toCurrencyCents, type Member, type MovementKind, type MovementCategory, type LedgerMovement } from '@/lib/ledger';

interface MovementComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  currentMemberId: string;
  onSubmit: (movement: LedgerMovement) => Promise<void>;
}

const categoryOptions: MovementCategory[] = ['Comida', 'Compras', 'Transporte', 'Alquiler', 'Otros'];

export function MovementComposer({ open, onOpenChange, members, currentMemberId, onSubmit }: MovementComposerProps) {
  const [kind, setKind] = useState<MovementKind>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('');
  const [recipient, setRecipient] = useState('');
  const [participants, setParticipants] = useState<string[]>(() => members.map((member) => member.id));
  const [category, setCategory] = useState<MovementCategory>('Comida');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPayer = members.some((member) => member.id === payer) ? payer : currentMemberId;
  const recipientOptions = members.filter((member) => member.id !== selectedPayer);
  const selectedRecipient = recipientOptions.some((member) => member.id === recipient)
    ? recipient
    : recipientOptions[0]?.id ?? '';

  function resetComposer() { setKind('expense'); setDescription(''); setAmount(''); setPayer(currentMemberId); setRecipient(''); setParticipants(members.map((member) => member.id)); setCategory('Comida'); setFormError(''); }
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
    const parsedAmount = roundCurrency(Number(amount.replace(',', '.')));
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) { setFormError('Completá una descripción y un importe mayor a cero.'); return; }
    if (kind === 'loan' && !selectedRecipient) { setFormError('Sumá a otra persona al grupo antes de registrar un préstamo.'); return; }
    if (kind === 'loan' && selectedRecipient === selectedPayer) { setFormError('Elegí una persona distinta a quien presta el dinero.'); return; }
    if (kind === 'expense' && participants.length === 0) { setFormError('Elegí al menos a una persona que haya participado del gasto.'); return; }
    if (kind === 'expense' && toCurrencyCents(parsedAmount) < participants.length) { setFormError('El importe debe alcanzar para asignar al menos un centavo a cada participante.'); return; }
    const movement: LedgerMovement = { id: `movement-${Date.now()}`, kind, description: description.trim(), amount: parsedAmount, paidBy: selectedPayer, recipient: kind === 'loan' ? selectedRecipient : undefined, category: kind === 'loan' ? 'Préstamo' : category, participants: kind === 'expense' ? participants : [], createdAt: new Date().toISOString() };
    setIsSubmitting(true);
    try {
      await onSubmit(movement);
      closeComposer();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el movimiento. Intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isSubmitting) closeComposer(); }}>
      <DialogContent showCloseButton={false} className="max-h-[85dvh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-[28px] bg-white p-6 sm:max-w-md">
        <form onSubmit={submitMovement}>
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-bold tracking-[-0.04em]">Nuevo movimiento</DialogTitle>
                <DialogDescription className="mt-2 leading-6 text-[#5d5d5d]">Registralo ahora. El balance se recalcula al guardar.</DialogDescription>
              </div>
              <button type="button" onClick={closeComposer} disabled={isSubmitting} aria-label="Cerrar" className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f6f6f6] text-[#1f1f1f] active:scale-[0.96] disabled:opacity-50"><XIcon aria-hidden="true" size={18} /></button>
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
            <Field label={kind === 'loan' ? 'Presta' : 'Pagó'} htmlFor="payer"><select id="payer" value={selectedPayer} onChange={(e) => setPayer(e.target.value)} className="h-12 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 text-sm outline-none focus:border-[#594ff4]">{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
            {kind === 'loan' ? (
              <Field label="Recibe" htmlFor="recipient"><select id="recipient" value={selectedRecipient} onChange={(e) => setRecipient(e.target.value)} disabled={recipientOptions.length === 0} className="h-12 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 text-sm outline-none focus:border-[#594ff4] disabled:bg-[#f6f6f6] disabled:text-[#888888]">{recipientOptions.length === 0 ? <option value="">No hay otra persona en el grupo</option> : recipientOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
            ) : (
              <>
                <Field label="Categoría" htmlFor="category"><select id="category" value={category} onChange={(e) => setCategory(e.target.value as MovementCategory)} className="h-12 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 text-sm outline-none focus:border-[#594ff4]">{categoryOptions.map((o) => <option key={o}>{o}</option>)}</select></Field>
                <fieldset className="rounded-2xl bg-[#f6f6f6] p-4">
                  <legend className="px-1 text-sm font-bold text-[#1f1f1f]">¿Quiénes participaron?</legend>
                  <div className="mt-2 space-y-2">
                    {members.map((member) => (
                      <label key={member.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-white px-3 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={participants.includes(member.id)}
                          onChange={() => toggleParticipant(member.id)}
                          className="size-4 accent-[#594ff4]"
                        />
                        <span className="flex-1">{member.name}</span>
                        {member.id === selectedPayer && <span className="text-xs text-[#5d5d5d]">Pagó</span>}
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#5d5d5d]">
                    {participants.length === 0
                      ? 'Elegí al menos una persona para calcular su parte.'
                      : `Se divide en partes iguales entre ${participants.length} de ${members.length} personas.`}
                  </p>
                </fieldset>
              </>
            )}
          </div>
          {formError && <p role="alert" className="mt-4 text-sm font-medium text-[#b42318]">{formError}</p>}
          <button type="submit" disabled={isSubmitting} className="mt-6 flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[#594ff4] px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> {isSubmitting ? 'Guardando...' : 'Guardar movimiento'}</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
