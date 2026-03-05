export function normalizeToteBarcode(input) {
  if (input == null) return null;

  const trimmed = String(input).trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  const digits = upper.match(/\d+/g)?.join('') || '';

  if (!digits) return null;

  return `TOTE-${digits}`;
}

