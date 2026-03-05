export function normalizeToteBarcode(input) {
  if (!input) return null;

  const cleaned = String(input)
    .replace(/[\n\r\t]/g, '')
    .trim()
    .toUpperCase();

  const digits = cleaned.replace(/\D/g, '');

  if (!digits) return null;

  return `TOTE-${digits}`;
}

