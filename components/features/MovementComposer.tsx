'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { XIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/layout/Field';
import { formatARS } from '@/lib/utils';
import { interpretMovementText, parseCurrencyAmount } from '@/lib/movement-draft';
import { recognizeReceipt } from '@/lib/receipt-ocr';
import { toCurrencyCents, type Member, type MovementKind, type MovementCategory, type DivisionMethod, type LedgerMovement } from '@/lib/ledger';

interface MovementComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  currentMemberId: string;
  groupId: string;
  initialKind: MovementKind;
  editingMovement?: LedgerMovement | null;
  onSubmit: (movement: LedgerMovement) => Promise<void>;
}

const categoryOptions: MovementCategory[] = ['Comida', 'Compras', 'Transporte', 'Alquiler', 'Otros'];

export function MovementComposer({ open, onOpenChange, members, currentMemberId, groupId, initialKind, editingMovement, onSubmit }: MovementComposerProps) {
  const [kind, setKind] = useState<MovementKind>('expense');
  const [phrase, setPhrase] = useState('');
  const [parseNotice, setParseNotice] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('');
  const [recipient, setRecipient] = useState('');
  const [participants, setParticipants] = useState<string[]>(() => members.map((member) => member.id));
  const [divisionMethod, setDivisionMethod] = useState<DivisionMethod>('equal');
  const [participantShares, setParticipantShares] = useState<Record<string, string>>({});
  const [incomePreview, setIncomePreview] = useState<{ amountCents: number; participants: string; shares: Array<{ memberId: string; amount: number }> } | null>(null);
  const [isPreviewingIncome, setIsPreviewingIncome] = useState(false);
  const [category, setCategory] = useState<MovementCategory>('Comida');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReadingReceipt, setIsReadingReceipt] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const selectedPayer = members.some((member) => member.id === payer) ? payer : currentMemberId;
  const recipientOptions = members.filter((member) => member.id !== selectedPayer);
  const selectedRecipient = recipientOptions.some((member) => member.id === recipient)
    ? recipient
    : '';

  useEffect(() => {
    if (!open) return;
    if (!editingMovement) {
      setKind(initialKind);
      return;
    }
    setKind(editingMovement.kind);
    setPhrase('');
    setParseNotice('Estás editando un movimiento existente. El balance se recalcula al guardar.');
    setDescription(editingMovement.description);
    setAmount(String(editingMovement.amount).replace('.', ','));
    setPayer(editingMovement.paidBy);
    setRecipient(editingMovement.recipient ?? '');
    setParticipants(editingMovement.participants);
    setDivisionMethod(editingMovement.divisionMethod ?? 'equal');
    setParticipantShares(Object.fromEntries(
      Object.entries(editingMovement.participantShares ?? {}).map(([memberId, value]) => [memberId, String(value).replace('.', ',')]),
    ));
    setIncomePreview(null);
    setCategory(editingMovement.category === 'Préstamo' ? 'Comida' : editingMovement.category);
    setFormError('');
  }, [editingMovement, initialKind, open]);

  function resetComposer() { setKind('expense'); setPhrase(''); setParseNotice(''); setDescription(''); setAmount(''); setPayer(currentMemberId); setRecipient(''); setParticipants(members.map((member) => member.id)); setDivisionMethod('equal'); setParticipantShares({}); setIncomePreview(null); setCategory('Comida'); setFormError(''); setIsReadingReceipt(false); setOcrProgress(0); }
  function closeComposer() { onOpenChange(false); resetComposer(); }

  function toggleParticipant(memberId: string) {
    setParticipants((current) => current.includes(memberId)
      ? current.filter((id) => id !== memberId)
      : [...current, memberId]);
    setFormError('');
    setIncomePreview(null);
    setParticipantShares((current) => {
      if (!participants.includes(memberId)) return { ...current, [memberId]: current[memberId] ?? '' };
      const next = { ...current };
      delete next[memberId];
      return next;
    });
  }

  function handleInterpretPhrase() {
    const draft = interpretMovementText(phrase, members, currentMemberId);
    if (draft.kind) setKind(draft.kind);
    if (draft.amount !== null) setAmount(String(draft.amount).replace('.', ','));
    if (draft.description) setDescription(draft.description);
    if (draft.paidBy) setPayer(draft.paidBy);
    if (draft.recipient) setRecipient(draft.recipient);
    if (draft.kind === 'expense') setCategory(draft.category);
    setParseNotice(draft.notice);
    setFormError('');
  }

  async function handleReceiptFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setFormError('Elegí una foto en formato JPG, PNG o WebP.'); return; }
    if (file.size > 12 * 1024 * 1024) { setFormError('La foto debe pesar menos de 12 MB.'); return; }

    setIsReadingReceipt(true);
    setOcrProgress(0);
    setFormError('');
    setParseNotice('Procesando la foto en este dispositivo. La imagen no se guarda ni se envía al servidor.');
    try {
      const receipt = await recognizeReceipt(file, setOcrProgress);
      if (receipt.amount !== null) setAmount(String(receipt.amount).replace('.', ','));
      if (receipt.description) setDescription(receipt.description);
      setParseNotice(receipt.amount !== null || receipt.description
        ? `Lectura tentativa (${receipt.confidence}% de confianza). Revisá el importe y la descripción antes de guardar.`
        : 'No pude leer importe ni descripción. Completalos manualmente para continuar.');
    } catch {
      setParseNotice('No pude procesar esta foto. Podés completar los datos manualmente.');
    } finally {
      setIsReadingReceipt(false);
    }
  }

  async function previewIncomeSplit() {
    const parsedAmount = parseCurrencyAmount(amount);
    if (parsedAmount === null || parsedAmount <= 0 || participants.length === 0) {
      setFormError('Ingresá un importe y elegí al menos una persona antes de calcular el reparto.');
      return;
    }
    setIsPreviewingIncome(true);
    setFormError('');
    try {
      const response = await fetch('/api/movements/income-split-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, amount: parsedAmount, participants }),
      });
      const data = await response.json() as { shares?: Array<{ memberId: string; amount: number }>; error?: { message?: string } };
      if (!response.ok || !data.shares) {
        setIncomePreview(null);
        setFormError(data.error?.message ?? 'No se pudo calcular el reparto por ingresos.');
        return;
      }
      setIncomePreview({
        amountCents: toCurrencyCents(parsedAmount),
        participants: [...participants].sort().join(','),
        shares: data.shares,
      });
    } catch {
      setIncomePreview(null);
      setFormError('No pudimos conectarnos para calcular el reparto. Probá de nuevo.');
    } finally {
      setIsPreviewingIncome(false);
    }
  }

  async function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || isReadingReceipt || isPreviewingIncome) return;
    const parsedAmount = parseCurrencyAmount(amount);
    if (!description.trim() || parsedAmount === null || parsedAmount <= 0) { setFormError('Completá una descripción y un importe mayor a cero.'); return; }
    if (kind === 'loan' && !selectedRecipient) { setFormError('Sumá a otra persona al grupo antes de registrar un préstamo.'); return; }
    if (kind === 'loan' && selectedRecipient === selectedPayer) { setFormError('Elegí una persona distinta a quien presta el dinero.'); return; }
    if (kind === 'expense' && participants.length === 0) { setFormError('Elegí al menos a una persona que haya participado del gasto.'); return; }
    const selectedShares = Object.fromEntries(participants.map((memberId) => [
      memberId,
      parseCurrencyAmount(participantShares[memberId] ?? '') ?? Number.NaN,
    ]));
    if (kind === 'expense' && divisionMethod === 'equal' && toCurrencyCents(parsedAmount) < participants.length) { setFormError('El importe debe alcanzar para asignar al menos un centavo a cada participante.'); return; }
    if (kind === 'expense' && divisionMethod === 'consumption') {
      const hasMissingShare = participants.some((memberId) => !participantShares[memberId]?.trim() || !Number.isFinite(selectedShares[memberId]) || selectedShares[memberId]! <= 0);
      const shareTotal = participants.reduce((sum, memberId) => sum + toCurrencyCents(selectedShares[memberId] ?? 0), 0);
      if (hasMissingShare || shareTotal !== toCurrencyCents(parsedAmount)) { setFormError('Ingresá una parte mayor a cero para cada persona y verificá que sumen el total.'); return; }
    }
    if (kind === 'expense' && divisionMethod === 'income') {
      const isPreviewCurrent = incomePreview?.amountCents === toCurrencyCents(parsedAmount)
        && incomePreview.participants === [...participants].sort().join(',');
      if (!isPreviewCurrent) { setFormError('Calculá y revisá el reparto por ingresos antes de guardar.'); return; }
    }
    const movement: LedgerMovement = { id: editingMovement?.id ?? `movement-${Date.now()}`, kind, description: description.trim(), amount: parsedAmount, paidBy: selectedPayer, recipient: kind === 'loan' ? selectedRecipient : undefined, category: kind === 'loan' ? 'Préstamo' : category, participants: kind === 'expense' ? participants : [], divisionMethod: kind === 'expense' ? divisionMethod : undefined, participantShares: kind === 'expense' && divisionMethod === 'consumption' ? selectedShares : undefined, createdAt: editingMovement?.createdAt ?? new Date().toISOString(), groupId };
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
                <DialogTitle className="text-2xl font-bold tracking-[-0.04em]">{editingMovement ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
                <DialogDescription className="mt-2 leading-6 text-[#5d5d5d]">{editingMovement ? 'Revisá los cambios. El balance se recalcula al guardar.' : 'Registralo ahora. El balance se recalcula al guardar.'}</DialogDescription>
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
            <Field label="Contalo en una frase" htmlFor="movement-phrase">
              <textarea id="movement-phrase" value={phrase} onChange={(event) => setPhrase(event.target.value)} rows={2} placeholder="Ej. Le presté $3.000 a Juan" className="w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 py-3 text-sm outline-none placeholder:text-[#888888] focus:border-[#594ff4]" />
              <button type="button" onClick={handleInterpretPhrase} disabled={!phrase.trim()} className="mt-2 min-h-10 rounded-full border border-[#e7e7e7] px-4 text-xs font-bold text-[#594ff4] disabled:opacity-50">Completar desde la frase</button>
            </Field>
            <Field label="Foto del ticket (opcional)" htmlFor="receipt-photo">
              <input id="receipt-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleReceiptFile} disabled={isReadingReceipt} className="block w-full rounded-2xl border border-[#e7e7e7] bg-white px-3 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[#f1f0ff] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#594ff4] disabled:opacity-60" />
              {isReadingReceipt && <p className="mt-2 text-xs text-[#5d5d5d]">Leyendo ticket: {Math.round(ocrProgress * 100)}%</p>}
              <p className="mt-2 text-xs leading-5 text-[#777777]">La lectura corre en tu dispositivo. Revisá los datos antes de guardar.</p>
            </Field>
            {parseNotice && <p role="status" className="rounded-2xl bg-[#f7f6ff] px-4 py-3 text-xs leading-5 text-[#5149ba]">{parseNotice}</p>}
            <Field label="Descripción" htmlFor="description"><input id="description" value={description} maxLength={160} onChange={(e) => setDescription(e.target.value)} placeholder={kind === 'expense' ? 'Ej. compra del súper' : 'Ej. préstamo a Juan'} className="h-12 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 text-sm outline-none placeholder:text-[#888888] focus:border-[#594ff4]" /></Field>
            <Field label="Importe" htmlFor="amount"><div className="flex h-12 items-center rounded-2xl border border-[#e7e7e7] bg-white focus-within:border-[#594ff4]"><span className="pl-4 text-sm font-bold text-[#5d5d5d]">$</span><input id="amount" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setIncomePreview(null); }} placeholder="0" className="h-full min-w-0 flex-1 rounded-2xl px-2 text-sm font-bold outline-none placeholder:text-[#888888]" /><span className="pr-4 text-xs font-medium text-[#888888]">ARS</span></div></Field>
            <Field label={kind === 'loan' ? 'Presta' : 'Pagó'} htmlFor="payer"><select id="payer" value={selectedPayer} onChange={(e) => setPayer(e.target.value)} className="h-12 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 text-sm outline-none focus:border-[#594ff4]">{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
            {kind === 'loan' ? (
              <Field label="Recibe" htmlFor="recipient"><select id="recipient" value={selectedRecipient} onChange={(e) => setRecipient(e.target.value)} disabled={recipientOptions.length === 0} className="h-12 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 text-sm outline-none focus:border-[#594ff4] disabled:bg-[#f6f6f6] disabled:text-[#888888]">{recipientOptions.length === 0 ? <option value="">No hay otra persona en el grupo</option> : <><option value="">Elegí quién recibe</option>{recipientOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</>}</select></Field>
            ) : (
              <>
                <Field label="Categoría" htmlFor="category"><select id="category" value={category} onChange={(e) => setCategory(e.target.value as MovementCategory)} className="h-12 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 text-sm outline-none focus:border-[#594ff4]">{categoryOptions.map((o) => <option key={o}>{o}</option>)}</select></Field>
                <Field label="Cómo dividirlo" htmlFor="division-method">
                  <select id="division-method" value={divisionMethod} onChange={(event) => { setDivisionMethod(event.target.value as DivisionMethod); setIncomePreview(null); setFormError(''); }} className="h-12 w-full rounded-2xl border border-[#e7e7e7] bg-white px-4 text-sm outline-none focus:border-[#594ff4]">
                    <option value="equal">En partes iguales</option>
                    <option value="consumption">Por consumo real</option>
                    <option value="income">Proporcional a ingresos</option>
                  </select>
                </Field>
                <fieldset className="rounded-2xl bg-[#f6f6f6] p-4">
                  <legend className="px-1 text-sm font-bold text-[#1f1f1f]">¿Quiénes participaron?</legend>
                  <div className="mt-2 space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="rounded-xl bg-white px-3 py-2 text-sm font-medium">
                        <label className="flex min-h-8 cursor-pointer items-center gap-3">
                          <input type="checkbox" checked={participants.includes(member.id)} onChange={() => toggleParticipant(member.id)} className="size-4 accent-[#594ff4]" />
                          <span className="flex-1">{member.name}</span>
                          {member.id === selectedPayer && <span className="text-xs text-[#5d5d5d]">Pagó</span>}
                        </label>
                        {divisionMethod === 'consumption' && participants.includes(member.id) && (
                          <div className="ml-7 mt-2 flex h-10 items-center rounded-xl border border-[#e7e7e7] focus-within:border-[#594ff4]">
                            <span className="pl-3 text-xs text-[#777777]">$</span>
                            <input aria-label={`Parte de ${member.name}`} inputMode="decimal" value={participantShares[member.id] ?? ''} onChange={(event) => { setParticipantShares((current) => ({ ...current, [member.id]: event.target.value })); setFormError(''); }} placeholder="Parte consumida" className="h-full min-w-0 flex-1 rounded-xl px-2 text-sm outline-none placeholder:text-[#888888]" />
                            <span className="pr-3 text-[11px] text-[#777777]">ARS</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#5d5d5d]">
                    {participants.length === 0
                      ? 'Elegí al menos una persona para calcular su parte.'
                      : divisionMethod === 'equal'
                        ? `Se divide en partes iguales entre ${participants.length} de ${members.length} personas.`
                        : divisionMethod === 'consumption'
                          ? 'Ingresá cuánto consumió cada persona. Las partes deben sumar el total.'
                          : 'El ingreso mensual se mantiene privado. Solo se muestra el importe calculado para cada participante.'}
                  </p>
                </fieldset>
                {divisionMethod === 'income' && (
                  <div>
                    <button type="button" onClick={() => { void previewIncomeSplit(); }} disabled={isPreviewingIncome || isReadingReceipt} className="min-h-11 w-full rounded-full border border-[#594ff4] px-4 text-sm font-bold text-[#594ff4] disabled:opacity-50">
                      {isPreviewingIncome ? 'Calculando reparto...' : 'Calcular reparto por ingresos'}
                    </button>
                    {incomePreview && (
                      <ul className="mt-3 space-y-2 rounded-2xl bg-[#f6f6f6] p-4 text-sm">
                        {incomePreview.shares.map((share) => (
                          <li key={share.memberId} className="flex justify-between gap-3">
                            <span>{members.find((member) => member.id === share.memberId)?.name ?? 'Integrante'}</span>
                            <strong className="tabular-nums">{formatARS(share.amount)}</strong>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          {formError && <p role="alert" className="mt-4 text-sm font-medium text-[#b42318]">{formError}</p>}
          <button type="submit" disabled={isSubmitting || isReadingReceipt || isPreviewingIncome} className="mt-6 flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[#594ff4] px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> {isSubmitting ? 'Guardando...' : editingMovement ? 'Guardar cambios' : 'Guardar movimiento'}</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
