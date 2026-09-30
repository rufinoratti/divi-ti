import { parseCurrencyAmount } from '@/lib/movement-draft';

export type ReceiptDraft = {
  amount: number | null;
  description: string;
  confidence: number;
  text: string;
};

const amountPattern = /(?:ARS\s*)?(?:\$\s*)?\d[\d.\s]*(?:,\d{1,2})?(?!\d)/gi;

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function lineAmounts(line: string) {
  return [...line.matchAll(amountPattern)]
    .map((match) => parseCurrencyAmount(match[0] ?? ''))
    .filter((value): value is number => value !== null);
}

export function parseReceiptText(text: string, ocrConfidence = 0) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[|]/g, ' ').trim())
    .filter(Boolean);
  const rankedTotals = lines
    .map((line, index) => {
      const normalized = normalize(line);
      const amounts = lineAmounts(line);
      const labelScore = /\b(total|importe a pagar|total a pagar|monto final|total general)\b/.test(normalized) ? 2 : 0;
      const currencyScore = /\$|ars/.test(normalized) ? 1 : 0;
      return { line, index, amounts, score: labelScore + currencyScore };
    })
    .filter((candidate) => candidate.amounts.length > 0)
    .sort((left, right) => right.score - left.score || right.index - left.index);
  const amount = rankedTotals[0]?.amounts.at(-1) ?? null;

  const descriptionLine = lines.find((line) => {
    const normalized = normalize(line);
    if (line.length < 4 || line.length > 90 || lineAmounts(line).length > 0) return false;
    return !/\b(cuit|cuil|iva|fecha|hora|ticket|factura|telefono|tel|cajero|tarjeta|debito|credito|cae|vencimiento|subtotal|descuento|total|gracias)\b/.test(normalized);
  });

  const confidence = Math.max(0, Math.min(100, Math.round(
    (ocrConfidence * 0.55)
      + (amount === null ? 0 : rankedTotals[0]?.score ? 35 : 20)
      + (descriptionLine ? 20 : 0),
  )));

  return {
    amount,
    description: descriptionLine?.slice(0, 160) ?? '',
    confidence,
    text,
  } satisfies ReceiptDraft;
}

export async function recognizeReceipt(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<ReceiptDraft> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('spa', 1, {
    langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
    logger: (message) => {
      if (message.status === 'recognizing text') onProgress?.(message.progress);
    },
  });

  try {
    const result = await worker.recognize(file);
    return parseReceiptText(result.data.text, result.data.confidence);
  } finally {
    await worker.terminate();
  }
}
