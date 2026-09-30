import { type Member, type MovementCategory, type MovementKind } from '@/lib/ledger';

export type MovementDraft = {
  kind: MovementKind | null;
  amount: number | null;
  description: string;
  paidBy: string | null;
  recipient: string | null;
  category: MovementCategory;
  confidence: 'high' | 'review' | 'low';
  notice: string;
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function parseCurrencyAmount(value: string) {
  const normalized = value.trim().replace(/^ARS\s*/i, '').replace(/\s*ARS$/i, '').replace(/[\s$]/g, '');
  if (!normalized || !/^\d[\d.,]*$/.test(normalized)) return null;

  let decimalValue = normalized;
  if (normalized.includes(',')) {
    if (!/^\d+(?:\.\d{3})*,\d{1,2}$/.test(normalized) && !/^\d+,\d{1,2}$/.test(normalized)) return null;
    decimalValue = normalized.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    decimalValue = normalized.replace(/\./g, '');
  } else if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(decimalValue);
  return Number.isFinite(amount) && amount > 0 ? Math.round((amount + Number.EPSILON) * 100) / 100 : null;
}

function getAmountMatch(text: string) {
  return text.match(/(?:ARS\s*)?(?:\$\s*)?\d[\d.\s]*(?:,\d{1,2})?(?!\d)/i)?.[0] ?? '';
}

function findMember(text: string, members: Member[]) {
  const normalizedText = ` ${normalize(text)} `;
  const matches = members
    .filter((member) => member.name.trim().length > 1)
    .sort((left, right) => right.name.length - left.name.length)
    .filter((member) => normalizedText.includes(` ${normalize(member.name)} `));
  if (!matches.length) return null;
  const longestLength = matches[0]!.name.length;
  const longestMatches = matches.filter((member) => member.name.length === longestLength);
  return longestMatches.length === 1 ? longestMatches[0]! : null;
}

function inferCategory(text: string): MovementCategory {
  const normalized = normalize(text);
  if (/\b(alquiler|expensas|renta)\b/.test(normalized)) return 'Alquiler';
  if (/\b(taxi|uber|cabify|colectivo|subte|tren|nafta|combustible)\b/.test(normalized)) return 'Transporte';
  if (/\b(super|supermercado|comida|cena|almuerzo|desayuno|restaurante|pizza)\b/.test(normalized)) return 'Comida';
  if (/\b(compra|compras|farmacia|limpieza)\b/.test(normalized)) return 'Compras';
  return 'Otros';
}

function cleanDescription(text: string, amountMatch: string, memberName?: string) {
  let description = text.replace(amountMatch, ' ');
  description = description.replace(/\b(?:le\s+)?prest[eéó]|\bpr[eé]stamo|\bme\s+prest[oó]|\bpag[ué]|\bpagu[eé]|\bcompr[eé]|\bcompramos|\bgastamos|\bgast[eé]|\bgasto\b/gi, ' ');
  if (memberName) {
    const escapedName = memberName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    description = description.replace(new RegExp(`\\b(?:a|de|para)\\s+${escapedName}\\b`, 'i'), ' ');
  }
  return description
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, '')
    .trim();
}

export function interpretMovementText(text: string, members: Member[], currentMemberId: string): MovementDraft {
  const amountMatch = getAmountMatch(text);
  const amount = amountMatch ? parseCurrencyAmount(amountMatch) : null;
  const normalized = normalize(text);
  const isLoan = /\b(preste|presto|prestamo|prestamos|prestaste|prestaron)\b/.test(normalized);
  const isLoanOut = /\b(le|les|te) preste\b/.test(normalized) || /\bpreste\b.*\ba\b/.test(normalized);
  const isLoanIn = /\bme presto\b/.test(normalized) || /\bprest[oó]\b.*\ba\s+mi\b/.test(text.toLowerCase());
  const mentionedMember = findMember(text, members.filter((member) => member.id !== currentMemberId));
  const isExpense = /\b(gasto|gastamos|pague|pagamos|compre|compramos|cena|compra|supermercado)\b/.test(normalized);
  const kind: MovementKind | null = isLoan ? 'loan' : isExpense ? 'expense' : null;
  const currentMemberName = members.find((member) => member.id === currentMemberId)?.name;
  let paidBy: string | null = null;
  let recipient: string | null = null;
  if (kind === 'loan' && mentionedMember && isLoanOut) {
    paidBy = currentMemberId;
    recipient = mentionedMember.id;
  } else if (kind === 'loan' && mentionedMember && isLoanIn) {
    paidBy = mentionedMember.id;
    recipient = currentMemberId;
  }

  const description = cleanDescription(text, amountMatch, mentionedMember?.name)
    || (kind === 'loan' ? 'Préstamo' : kind === 'expense' ? 'Gasto compartido' : text.trim());
  const complete = kind !== null && amount !== null && (kind !== 'loan' || recipient !== null);

  return {
    kind,
    amount,
    description: description.slice(0, 160),
    paidBy,
    recipient,
    category: kind === 'loan' ? 'Préstamo' : inferCategory(text),
    confidence: complete ? 'high' : kind || amount ? 'review' : 'low',
    notice: complete
      ? 'Revisá el borrador antes de guardarlo.'
      : kind === 'loan' && !recipient
        ? `No pude identificar con seguridad quién participa. Revisá ${currentMemberName ? 'quién presta y quién recibe' : 'los participantes'} antes de guardar.`
        : 'No pude completar todo desde la frase. Revisá el tipo, el importe y la descripción.',
  };
}
