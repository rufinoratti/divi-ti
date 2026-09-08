'use client';

import { useState, type FormEvent } from 'react';
import { XIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/layout/Field';
import { type Member, type MovementKind, type MovementCategory, type LedgerMovement } from '@/lib/ledger';

interface MovementComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  currentMemberId: string;
  onSubmit: (movement: LedgerMovement) => void;
}

const categoryOptions: MovementCategory[] = ['Comida', 'Compras', 'Transporte', 'Alquiler'];

export function MovementComposer({ open, onOpenChange, members, currentMemberId, onSubmit }: MovementComposerProps) {
  const [kind, setKind] = useState<MovementKind>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState(currentMemberId);
  const [recipient, setRecipient] = useState('nico');
  const [category, setCategory] = useState<MovementCategory>('Comida');
  const [formError, setFormError] = useState('');

  function resetComposer() { setKind('expense'); setDescription(''); setAmount(''); setPayer(currentMemberId); setRecipient('nico'); setCategory('Comida'); setFormError(''); }
  function closeComposer() { onOpenChange(false); resetComposer(); }

  function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount.replace(',', '.'));
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) { setFormError('Completá una descripción y un importe mayor a cero.'); return; }
    if (kind === 'loan' && (!recipient || recipient === payer)) { setFormError('Elegí una persona distinta a quien presta el dinero.'); return; }
    const movement: LedgerMovement = { id: `movement-${Date.now()}`, kind, description: description.trim(), amount: parsedAmount, paidBy: payer, recipient: kind === 'loan' ? recipient : undefined, category: kind === 'loan' ? 'Préstamo' : category, participants: kind === 'expense' ? members.map((m) => m.id) : [], createdAt: new Date().toISOString() };
    onSubmit(movement); closeComposer();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) closeComposer(); }}>
      <DialogContent showCloseButton={false} className="max-w-[calc(100%-2rem)] rounded-[28px] bg-white p-6 sm:max-w-md">
        <form onSubmit={submitMovement}>
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-bold tracking-[-0.04em]">Nuevo movimiento</DialogTitle>
                <DialogDescription className="mt-2 leading-6 text-[#5d5d5d]">Registralo ahora. El balance se recalcula al guardar.</DialogDescription>
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
                <p className="rounded-2xl bg-[#f6f6f6] px-4 py-3 text-xs leading-5 text-[#5d5d5d]">Se divide por partes iguales entre las {members.length} personas del grupo.</p>
              </>
            )}
          </div>
          {formError && <p role="alert" className="mt-4 text-sm font-medium text-[#b42318]">{formError}</p>}
          <button type="submit" className="mt-6 flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[#594ff4] px-5 text-sm font-bold text-white transition active:scale-[0.98]"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> Guardar movimiento</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
