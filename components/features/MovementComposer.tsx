'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { CameraIcon, HandCoinsIcon, PlusIcon, ReceiptTextIcon, Trash2Icon, XIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Field } from '@/components/layout/Field';
import { formatARS } from '@/lib/utils';
import { interpretMovementText, parseCurrencyAmount } from '@/lib/movement-draft';
import { splitAmountEquallyByMemberId, toCurrencyCents, type Member, type MovementKind, type MovementCategory, type DivisionMethod, type LedgerMovement } from '@/lib/ledger';

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

type ReceiptItemDraft = {
  id: string;
  name: string;
  quantity: number | null;
  amount: string;
  participants: string[];
};

type ReceiptSplitMode = 'total' | 'products';

type ReceiptProductSplit = {
  participants: string[];
  shares: Record<string, number>;
  error: string;
};

const RECEIPT_IMAGE_MAX_EDGE = 2400;
const RECEIPT_IMAGE_COMPRESSION_THRESHOLD = 1_200_000;

async function optimizeReceiptImage(file: File) {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('No se pudo preparar la imagen.'));
      element.src = imageUrl;
    });

    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
    if (longestEdge <= RECEIPT_IMAGE_MAX_EDGE && file.size <= RECEIPT_IMAGE_COMPRESSION_THRESHOLD) return file;

    const scale = Math.min(1, RECEIPT_IMAGE_MAX_EDGE / longestEdge);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'ticket';
    return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function calculateReceiptProductSplit(items: ReceiptItemDraft[], total: number): ReceiptProductSplit {
  if (!items.length) return { participants: [], shares: {}, error: 'No hay productos para dividir.' };

  const grossSharesCents = new Map<string, number>();
  for (const item of items) {
    const amount = parseCurrencyAmount(item.amount);
    if (!item.name.trim() || amount === null) {
      return { participants: [], shares: {}, error: 'Revisá el nombre y el importe de cada producto.' };
    }
    if (!item.participants.length) {
      return { participants: [], shares: {}, error: `Elegí quién consumió ${item.name}.` };
    }

    const itemShares = splitAmountEquallyByMemberId(amount, item.participants);
    for (const [memberId, share] of Object.entries(itemShares)) {
      grossSharesCents.set(memberId, (grossSharesCents.get(memberId) ?? 0) + toCurrencyCents(share));
    }
  }

  const grossShares = [...grossSharesCents.entries()].filter(([, cents]) => cents > 0);
  const totalCents = toCurrencyCents(total);
  if (!grossShares.length || totalCents < grossShares.length) {
    return { participants: [], shares: {}, error: 'El total debe alcanzar para asignar al menos un centavo a cada persona.' };
  }

  const grossTotalCents = grossShares.reduce((sum, [, cents]) => sum + cents, 0);
  const centsAfterMinimumShares = totalCents - grossShares.length;
  const weightedShares = grossShares.map(([memberId, grossCents]) => {
    const exactCents = centsAfterMinimumShares * grossCents / grossTotalCents;
    return { memberId, cents: Math.floor(exactCents), remainder: exactCents % 1 };
  });
  let leftoverCents = centsAfterMinimumShares - weightedShares.reduce((sum, share) => sum + share.cents, 0);
  const remainderOrder = [...weightedShares].sort((left, right) => right.remainder - left.remainder || left.memberId.localeCompare(right.memberId));
  for (let index = 0; index < remainderOrder.length && leftoverCents > 0; index += 1) {
    remainderOrder[index]!.cents += 1;
    leftoverCents -= 1;
  }

  const shares = Object.fromEntries(weightedShares.map(({ memberId, cents }) => [memberId, (cents + 1) / 100]));
  return {
    participants: grossShares.map(([memberId]) => memberId),
    shares,
    error: '',
  };
}

function createReceiptDescription(items: ReceiptItemDraft[], totalAmount: number | null) {
  const itemLines = items.flatMap((item) => {
    const name = item.name.trim().replace(/\s+/g, ' ');
    const amount = parseCurrencyAmount(item.amount);
    return name && amount !== null ? [`• ${name}: ${formatARS(amount).replace(/\s/g, '')}`] : [];
  });
  const totalLine = totalAmount === null ? '' : `Total: ${formatARS(totalAmount).replace(/\s/g, '')}`;
  const availableLength = 1000 - (totalLine ? totalLine.length + 1 : 0);
  const visibleLines: string[] = [];
  let omittedCount = 0;

  for (const line of itemLines) {
    const candidate = [...visibleLines, line].join('\n');
    if (candidate.length <= availableLength) visibleLines.push(line);
    else omittedCount += 1;
  }

  while (visibleLines.length && `${visibleLines.join('\n')}${omittedCount ? `\n• +${omittedCount} productos` : ''}`.length > availableLength) {
    visibleLines.pop();
    omittedCount += 1;
  }

  const omittedLine = omittedCount ? `• +${omittedCount} productos` : '';
  return [...visibleLines, omittedLine, totalLine].filter(Boolean).join('\n') || 'Revisar productos';
}

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
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [receiptAnalysisFailed, setReceiptAnalysisFailed] = useState(false);
  const [receiptItems, setReceiptItems] = useState<ReceiptItemDraft[]>([]);
  const [receiptSplitMode, setReceiptSplitMode] = useState<ReceiptSplitMode>('total');

  const selectedPayer = members.some((member) => member.id === payer) ? payer : currentMemberId;
  const recipientOptions = members.filter((member) => member.id !== selectedPayer);
  const selectedRecipient = recipientOptions.some((member) => member.id === recipient)
    ? recipient
    : '';
  const receiptTotalAmount = parseCurrencyAmount(amount);
  const receiptItemsTotalCents = receiptItems.reduce((sum, item) => {
    const itemAmount = parseCurrencyAmount(item.amount);
    return sum + (itemAmount === null ? 0 : toCurrencyCents(itemAmount));
  }, 0);
  const receiptDifferenceCents = receiptTotalAmount === null
    ? null
    : toCurrencyCents(receiptTotalAmount) - receiptItemsTotalCents;
  const receiptProductSplit = calculateReceiptProductSplit(receiptItems, receiptTotalAmount ?? 0);

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

  function resetComposer() {
    setKind('expense'); setPhrase(''); setParseNotice(''); setDescription(''); setAmount(''); setPayer(currentMemberId); setRecipient('');
    setParticipants(members.map((member) => member.id)); setDivisionMethod('equal'); setParticipantShares({}); setIncomePreview(null);
    setCategory('Comida'); setFormError(''); setReceiptFile(null);
    setIsAnalyzingReceipt(false); setReceiptAnalysisFailed(false); setReceiptItems([]); setReceiptSplitMode('total');
  }
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

  function handleReceiptFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setReceiptFile(null);
    setReceiptItems([]);
    setReceiptSplitMode('total');
    setReceiptAnalysisFailed(false);
    setAmount('');
    setDescription('');
    setFormError('');
    setParseNotice('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setFormError('Elegí una foto en formato JPG, PNG o WebP.'); return; }
    if (file.size > 12 * 1024 * 1024) { setFormError('La foto debe pesar menos de 12 MB.'); return; }

    setReceiptFile(file);
    void analyzeReceiptWithAI(file);
  }

  async function analyzeReceiptWithAI(file: File) {
    if (isAnalyzingReceipt) return;

    setIsAnalyzingReceipt(true);
    setReceiptAnalysisFailed(false);
    setFormError('');
    setParseNotice('Analizando el total y los productos del ticket con IA…');
    console.info('[receipt] solicitando análisis con IA al cargar la foto', { type: file.type, sizeBytes: file.size });

    try {
      const optimizedFile = await optimizeReceiptImage(file);
      setReceiptFile(optimizedFile);
      const formData = new FormData();
      formData.append('receipt', optimizedFile);
      const response = await fetch('/api/receipts/analyze', { method: 'POST', body: formData });
      console.info('[receipt] respuesta de API de IA', { status: response.status, ok: response.ok });
      const data = await response.json() as {
        receipt?: {
          totalAmount: number | null;
          items: Array<{
            name: string;
            amount: number;
            quantity: number | null;
          }>;
        };
        error?: { message?: string };
      };

      if (!response.ok || !data.receipt) {
        console.warn('[receipt] análisis con IA no completado', {
          status: response.status,
          message: data.error?.message ?? 'sin detalle',
        });
        setReceiptAnalysisFailed(true);
        setParseNotice(data.error?.message ?? 'No pudimos analizar el ticket. Completá los datos manualmente.');
        return;
      }

      const receipt = data.receipt;
      const items = receipt.items.map((item, index) => ({
        id: `receipt-${Date.now()}-${index}`,
        name: item.name,
        quantity: item.quantity,
        amount: String(item.amount).replace('.', ','),
        participants: [],
      }));
      console.info('[receipt] análisis con IA completado', {
        totalFound: receipt.totalAmount !== null,
        productsFound: items.length,
      });
      if (receipt.totalAmount !== null) setAmount(String(receipt.totalAmount).replace('.', ','));
      setDescription(createReceiptDescription(items, receipt.totalAmount));
      setReceiptItems(items);
      setReceiptSplitMode('total');
      setParseNotice(receipt.totalAmount === null
        ? `La IA detectó ${items.length} productos, pero no pudo leer el total con claridad. Revisá los datos antes de guardar.`
        : items.length
          ? `La IA detectó un total de ${formatARS(receipt.totalAmount)} y ${items.length} productos. Revisá la descripción antes de guardar.`
          : `La IA detectó un total de ${formatARS(receipt.totalAmount)}, pero no encontró productos legibles. Revisá la descripción antes de guardar.`);
    } catch (error) {
      console.error('[receipt] llamada a la IA falló', { errorName: error instanceof Error ? error.name : 'unknown' });
      setReceiptAnalysisFailed(true);
      setParseNotice('No pudimos comunicarnos con la IA. Revisá la conexión o completá los datos manualmente.');
    } finally {
      setIsAnalyzingReceipt(false);
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
    if (isSubmitting || isAnalyzingReceipt || isPreviewingIncome) return;
    const parsedAmount = parseCurrencyAmount(amount);
    if (!description.trim() || parsedAmount === null || parsedAmount <= 0) { setFormError('Completá una descripción y un importe mayor a cero.'); return; }
    if (kind === 'loan' && !selectedRecipient) { setFormError('Sumá a otra persona al grupo antes de registrar un préstamo.'); return; }
    if (kind === 'loan' && selectedRecipient === selectedPayer) { setFormError('Elegí una persona distinta a quien presta el dinero.'); return; }
    const isProductSplit = kind === 'expense' && receiptSplitMode === 'products';
    const productSplit = isProductSplit ? calculateReceiptProductSplit(receiptItems, parsedAmount) : null;
    if (productSplit?.error) { setFormError(productSplit.error); return; }
    const movementParticipants = isProductSplit ? productSplit!.participants : participants;
    if (kind === 'expense' && movementParticipants.length === 0) { setFormError('Elegí al menos a una persona que haya participado del gasto.'); return; }
    const selectedShares = Object.fromEntries(participants.map((memberId) => [
      memberId,
      parseCurrencyAmount(participantShares[memberId] ?? '') ?? Number.NaN,
    ]));
    if (kind === 'expense' && !isProductSplit && divisionMethod === 'equal' && toCurrencyCents(parsedAmount) < participants.length) { setFormError('El importe debe alcanzar para asignar al menos un centavo a cada participante.'); return; }
    if (kind === 'expense' && !isProductSplit && divisionMethod === 'consumption') {
      const hasMissingShare = participants.some((memberId) => !participantShares[memberId]?.trim() || !Number.isFinite(selectedShares[memberId]) || selectedShares[memberId]! <= 0);
      const shareTotal = participants.reduce((sum, memberId) => sum + toCurrencyCents(selectedShares[memberId] ?? 0), 0);
      if (hasMissingShare || shareTotal !== toCurrencyCents(parsedAmount)) { setFormError('Ingresá una parte mayor a cero para cada persona y verificá que sumen el total.'); return; }
    }
    if (kind === 'expense' && divisionMethod === 'income') {
      const isPreviewCurrent = incomePreview?.amountCents === toCurrencyCents(parsedAmount)
        && incomePreview.participants === [...participants].sort().join(',');
      if (!isPreviewCurrent) { setFormError('Calculá y revisá el reparto por ingresos antes de guardar.'); return; }
    }
    const movement: LedgerMovement = {
      id: editingMovement?.id ?? `movement-${Date.now()}`,
      kind,
      description: description.trim(),
      amount: parsedAmount,
      paidBy: selectedPayer,
      recipient: kind === 'loan' ? selectedRecipient : undefined,
      category: kind === 'loan' ? 'Préstamo' : category,
      participants: kind === 'expense' ? movementParticipants : [],
      divisionMethod: kind === 'expense' ? isProductSplit ? 'consumption' : divisionMethod : undefined,
      participantShares: kind === 'expense' && isProductSplit
        ? productSplit!.shares
        : kind === 'expense' && divisionMethod === 'consumption'
          ? selectedShares
          : undefined,
      createdAt: editingMovement?.createdAt ?? new Date().toISOString(),
      groupId,
    };
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
    <Sheet open={open} onOpenChange={(o) => { if (!o && !isSubmitting) closeComposer(); }}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto flex h-[90dvh] max-h-[94dvh] w-full max-w-[540px] flex-col gap-0 overflow-hidden rounded-t-[28px] border-line bg-white p-0 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-18px_48px_rgba(31,31,31,0.12)]"
      >
        <form onSubmit={submitMovement} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-line bg-white px-5 pb-4 pt-3 sm:px-6">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#d9d9df]" aria-hidden="true" />
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <SheetTitle className="divi-section-title text-xl font-bold">{editingMovement ? 'Editar movimiento' : 'Nuevo movimiento'}</SheetTitle>
                <SheetDescription className="mt-1.5 leading-5 text-copy-muted">{editingMovement ? 'El balance se actualiza al guardar.' : 'Completá los datos y revisá el reparto antes de guardar.'}</SheetDescription>
              </div>
              <button type="button" onClick={closeComposer} disabled={isSubmitting} aria-label="Cerrar" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-ink transition active:scale-[0.96] disabled:opacity-50"><XIcon aria-hidden="true" size={18} /></button>
            </div>
          <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-surface p-1">
            {[
              { id: 'expense' as const, label: 'Gasto grupal', icon: ReceiptTextIcon },
              { id: 'loan' as const, label: 'Préstamo', icon: HandCoinsIcon },
            ].map((option) => (
              <button key={option.id} type="button" aria-pressed={kind === option.id} onClick={() => { setKind(option.id); setFormError(''); }} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition active:scale-[0.98] ${kind === option.id ? 'bg-white text-brand shadow-[0_1px_4px_rgba(31,31,31,0.08)]' : 'text-copy-muted'}`}>
                <option.icon aria-hidden="true" size={17} strokeWidth={1.8} />
                {option.label}
              </button>
            ))}
          </div>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
            <Field label="Contalo en una frase" htmlFor="movement-phrase">
              <textarea id="movement-phrase" value={phrase} onChange={(event) => setPhrase(event.target.value)} rows={2} placeholder="Ej. Le presté $3.000 a Juan" className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none placeholder:text-copy-muted focus:border-brand" />
              <button type="button" onClick={handleInterpretPhrase} disabled={!phrase.trim()} className="mt-2 min-h-10 rounded-full border border-line px-4 text-xs font-bold text-brand disabled:opacity-50">Completar desde la frase</button>
            </Field>
            <Field label="Foto del ticket (opcional)" htmlFor="receipt-photo">
              <div className="relative">
                <input id="receipt-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleReceiptFile} disabled={isAnalyzingReceipt} aria-describedby="receipt-photo-help" className="peer sr-only" />
                <label htmlFor="receipt-photo" className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-white px-3 transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand peer-focus-visible:outline-offset-2">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                    {isAnalyzingReceipt ? <span className="size-4 animate-spin rounded-full border-2 border-brand/25 border-t-brand" aria-hidden="true" /> : <CameraIcon aria-hidden="true" size={19} strokeWidth={1.8} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{isAnalyzingReceipt ? 'Leyendo el ticket…' : receiptFile ? 'Cambiar foto del ticket' : 'Tomar foto o elegir una imagen'}</span>
                    {receiptFile && <span className="mt-0.5 block truncate text-xs text-copy-muted">{receiptFile.name}</span>}
                  </span>
                </label>
              </div>
              <p id="receipt-photo-help" className="mt-2 text-xs leading-5 text-copy-muted">La imagen se envía a OpenRouter para detectar el total y los productos con sus precios.</p>
              {isAnalyzingReceipt && <p role="status" className="sr-only">Analizando el total y los productos del ticket.</p>}
              {receiptFile && receiptAnalysisFailed && (
                <button type="button" onClick={() => { void analyzeReceiptWithAI(receiptFile); }} disabled={isAnalyzingReceipt} className="mt-3 min-h-11 w-full rounded-full border border-brand px-4 text-sm font-bold text-brand disabled:opacity-50">
                  {isAnalyzingReceipt ? 'Analizando ticket…' : 'Reintentar análisis con IA'}
                </button>
              )}
            </Field>
            {parseNotice && <p role="status" className="rounded-2xl bg-brand-wash px-4 py-3 text-xs leading-5 text-[#5149ba]">{parseNotice}</p>}
            <Field label="Descripción" htmlFor="description">
              <textarea
                id="description"
                value={description}
                rows={Math.min(Math.max(description.split('\n').length, 2), 8)}
                maxLength={1000}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={kind === 'expense' ? 'Ej. compra del súper' : 'Ej. préstamo a Juan'}
                className="w-full resize-y rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-6 outline-none placeholder:text-copy-muted focus:border-brand"
              />
            </Field>
            <Field label="Importe" htmlFor="amount"><div className="flex h-12 items-center rounded-2xl border border-line bg-white focus-within:border-brand"><span className="pl-4 text-sm font-bold text-copy-muted">$</span><input id="amount" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setIncomePreview(null); }} placeholder="0" className="h-full min-w-0 flex-1 rounded-2xl px-2 text-sm font-bold outline-none placeholder:text-copy-muted" /><span className="pr-4 text-xs font-medium text-copy-muted">ARS</span></div></Field>
            {kind === 'expense' && receiptItems.length > 0 && (
              <section aria-labelledby="receipt-split-title" className="space-y-3 rounded-2xl border border-line p-4">
                <div>
                  <h3 id="receipt-split-title" className="text-sm font-bold">¿Cómo querés dividir el ticket?</h3>
                  <p className="mt-1 text-xs leading-5 text-copy-muted">El total detectado es {receiptTotalAmount === null ? 'editable' : formatARS(receiptTotalAmount)}.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" aria-pressed={receiptSplitMode === 'total'} onClick={() => { setReceiptSplitMode('total'); setFormError(''); }} className={`min-h-11 rounded-xl px-3 text-xs font-bold ${receiptSplitMode === 'total' ? 'bg-brand text-white' : 'bg-surface text-copy-muted'}`}>
                    Dividir total
                  </button>
                  <button type="button" aria-pressed={receiptSplitMode === 'products'} onClick={() => { setReceiptSplitMode('products'); setFormError(''); }} className={`min-h-11 rounded-xl px-3 text-xs font-bold ${receiptSplitMode === 'products' ? 'bg-brand text-white' : 'bg-surface text-copy-muted'}`}>
                    Asignar productos
                  </button>
                </div>
              </section>
            )}
            <Field label={kind === 'loan' ? 'Presta' : 'Pagó'} htmlFor="payer"><select id="payer" value={selectedPayer} onChange={(e) => setPayer(e.target.value)} className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm outline-none focus:border-brand">{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
            {kind === 'loan' ? (
              <Field label="Recibe" htmlFor="recipient"><select id="recipient" value={selectedRecipient} onChange={(e) => setRecipient(e.target.value)} disabled={recipientOptions.length === 0} className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm outline-none focus:border-brand disabled:bg-surface disabled:text-subtle">{recipientOptions.length === 0 ? <option value="">No hay otra persona en el grupo</option> : <><option value="">Elegí quién recibe</option>{recipientOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</>}</select></Field>
            ) : (
              <>
                <Field label="Categoría" htmlFor="category"><select id="category" value={category} onChange={(e) => setCategory(e.target.value as MovementCategory)} className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm outline-none focus:border-brand">{categoryOptions.map((o) => <option key={o}>{o}</option>)}</select></Field>
                {receiptSplitMode !== 'products' ? (
                  <>
                    <Field label="Cómo dividirlo" htmlFor="division-method">
                      <select id="division-method" value={divisionMethod} onChange={(event) => { setDivisionMethod(event.target.value as DivisionMethod); setIncomePreview(null); setFormError(''); }} className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm outline-none focus:border-brand">
                        <option value="equal">En partes iguales</option>
                        <option value="consumption">Por consumo real</option>
                        <option value="income">Proporcional a ingresos</option>
                      </select>
                    </Field>
                    <fieldset className="rounded-2xl bg-surface p-4">
                      <legend className="px-1 text-sm font-bold text-ink">¿Quiénes participaron?</legend>
                      <div className="mt-2 space-y-2">
                        {members.map((member) => (
                          <div key={member.id} className="rounded-xl bg-white px-3 py-2 text-sm font-medium">
                            <label className="flex min-h-8 cursor-pointer items-center gap-3">
                              <input type="checkbox" checked={participants.includes(member.id)} onChange={() => toggleParticipant(member.id)} className="size-4 accent-brand" />
                              <span className="flex-1">{member.name}</span>
                              {member.id === selectedPayer && <span className="text-xs text-copy-muted">Pagó</span>}
                            </label>
                            {divisionMethod === 'consumption' && participants.includes(member.id) && (
                              <div className="ml-7 mt-2 flex h-10 items-center rounded-xl border border-line focus-within:border-brand">
                                <span className="pl-3 text-xs text-copy-muted">$</span>
                                <input aria-label={`Parte de ${member.name}`} inputMode="decimal" value={participantShares[member.id] ?? ''} onChange={(event) => { setParticipantShares((current) => ({ ...current, [member.id]: event.target.value })); setFormError(''); }} placeholder="Parte consumida" className="h-full min-w-0 flex-1 rounded-xl px-2 text-sm outline-none placeholder:text-copy-muted" />
                                <span className="pr-3 text-[11px] text-copy-muted">ARS</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-xs leading-5 text-copy-muted">
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
                        <button type="button" onClick={() => { void previewIncomeSplit(); }} disabled={isPreviewingIncome || isAnalyzingReceipt} className="min-h-11 w-full rounded-full border border-brand px-4 text-sm font-bold text-brand disabled:opacity-50">
                          {isPreviewingIncome ? 'Calculando reparto...' : 'Calcular reparto por ingresos'}
                        </button>
                        {incomePreview && (
                          <ul className="mt-3 space-y-2 rounded-2xl bg-surface p-4 text-sm">
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
                ) : (
                  <fieldset className="space-y-3 rounded-2xl bg-surface p-4">
                    <legend className="px-1 text-sm font-bold text-ink">Asigná los productos</legend>
                    <p className="text-xs leading-5 text-copy-muted">Si varias personas comparten un producto, su importe se divide entre ellas.</p>
                    {receiptItems.map((item, index) => (
                      <div key={item.id} className="space-y-3 rounded-xl bg-white p-3">
                        <div className="flex items-center gap-2">
                          <input aria-label={`Producto ${index + 1}`} value={item.name} onChange={(event) => { setReceiptItems((current) => current.map((line) => line.id === item.id ? { ...line, name: event.target.value } : line)); setFormError(''); }} maxLength={120} placeholder="Nombre del producto" className="h-10 min-w-0 flex-1 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand" />
                          <button type="button" onClick={() => { setReceiptItems((current) => current.filter((line) => line.id !== item.id)); if (receiptItems.length === 1) setReceiptSplitMode('total'); setFormError(''); }} aria-label={`Quitar ${item.name || `producto ${index + 1}`}`} className="grid size-10 shrink-0 place-items-center rounded-full text-subtle hover:bg-surface"><Trash2Icon aria-hidden="true" size={16} /></button>
                        </div>
                        <label className="flex h-10 items-center rounded-xl border border-line focus-within:border-brand">
                          <span className="pl-3 text-xs text-copy-muted">$</span>
                          <input aria-label={`Importe de ${item.name || `producto ${index + 1}`}`} inputMode="decimal" value={item.amount} onChange={(event) => { setReceiptItems((current) => current.map((line) => line.id === item.id ? { ...line, amount: event.target.value } : line)); setFormError(''); }} className="h-full min-w-0 flex-1 rounded-xl px-2 text-sm outline-none" />
                          <span className="pr-3 text-[11px] text-copy-muted">ARS</span>
                        </label>
                        {item.quantity !== null && item.quantity !== 1 && <p className="text-[11px] text-copy-muted">Cantidad detectada: {item.quantity}</p>}
                        <div role="group" className="flex flex-wrap gap-2" aria-label={`Quiénes consumieron ${item.name || `producto ${index + 1}`}`}>
                          {members.map((member) => (
                            <label key={member.id} className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-line px-3 text-xs font-medium">
                              <input type="checkbox" checked={item.participants.includes(member.id)} onChange={() => { setReceiptItems((current) => current.map((line) => line.id === item.id ? { ...line, participants: line.participants.includes(member.id) ? line.participants.filter((id) => id !== member.id) : [...line.participants, member.id] } : line)); setFormError(''); }} className="size-3.5 accent-brand" />
                              {member.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => { setReceiptItems((current) => [...current, { id: `manual-${Date.now()}-${current.length}`, name: '', quantity: null, amount: '', participants: [...participants] }]); setFormError(''); }} className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-bold text-brand"><PlusIcon aria-hidden="true" size={15} />Agregar producto</button>
                    <div className="rounded-xl bg-white px-3 py-2 text-xs leading-5 text-copy-muted">
                      <p>Productos: {formatARS(receiptItemsTotalCents / 100)} · Total del ticket: {receiptTotalAmount === null ? 'Ingresalo arriba' : formatARS(receiptTotalAmount)}</p>
                      {receiptDifferenceCents !== null && receiptDifferenceCents !== 0 && <p className="mt-1">La diferencia de {formatARS(Math.abs(receiptDifferenceCents) / 100)} se ajusta proporcionalmente entre quienes tienen productos asignados.</p>}
                      {receiptProductSplit.error
                        ? <p className="mt-1 font-medium text-danger">{receiptProductSplit.error}</p>
                        : <ul className="mt-2 space-y-1 border-t border-line pt-2">
                            {receiptProductSplit.participants.map((memberId) => (
                              <li key={memberId} className="flex justify-between gap-3"><span>{members.find((member) => member.id === memberId)?.name ?? 'Integrante'}</span><strong className="tabular-nums">{formatARS(receiptProductSplit.shares[memberId] ?? 0)}</strong></li>
                            ))}
                          </ul>}
                    </div>
                  </fieldset>
                )}
              </>
            )}
          </div>
          <div className="shrink-0 border-t border-line bg-white/95 px-5 pb-3 pt-3 backdrop-blur-sm sm:px-6">
            {formError && <p role="alert" className="mb-3 rounded-xl bg-[#fff8f7] px-3 py-2 text-sm font-medium text-danger">{formError}</p>}
            <button type="submit" disabled={isSubmitting || isAnalyzingReceipt || isPreviewingIncome} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-white transition duration-150 active:scale-[0.985] disabled:cursor-wait disabled:opacity-60">
              <PlusIcon aria-hidden="true" size={18} strokeWidth={2} />
              {isSubmitting ? 'Guardando…' : editingMovement ? 'Guardar cambios' : 'Guardar movimiento'}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
