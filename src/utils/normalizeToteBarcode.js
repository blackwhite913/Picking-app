export function normalizeToteBarcode(input) {
  if (!input) return null;

  // Convert to string
  let value = String(input);

  // Remove ALL control characters
  value = value.replace(/[\x00-\x1F\x7F]/g, '');

  // Remove whitespace
  value = value.trim();

  // Uppercase
  value = value.toUpperCase();

  // Extract digits
  const digits = value.replace(/\D/g, '');

  if (!digits) return null;

  return `TOTE-${digits}`;
}

