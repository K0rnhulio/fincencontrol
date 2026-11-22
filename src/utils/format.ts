/**
 * Format integer VND with dots as thousand separators, matching Vietnamese convention:
 * e.g. 100000000 -> "100.000.000 ₫"
 */
export function formatVND(amount: number, showSign?: 'topup' | 'expense'): string {
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (showSign === 'topup') return `+${formatted} ₫`;
  if (showSign === 'expense') return `-${formatted} ₫`;
  return amount < 0 ? `-${formatted} ₫` : `${formatted} ₫`;
}

/**
 * Parse a user-entered VND string like "100.000.000" or "8,500,000" or "8500000"
 */
export function parseVndInput(input: string): number {
  const digits = input.replace(/[^\d]/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) || 0;
}

/**
 * Format live input with dots: "8500000" -> "8.500.000"
 */
export function formatVndInput(input: string): string {
  const digits = input.replace(/[^\d]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
