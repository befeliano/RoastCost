/** Money is always integer kuruş (1 TL = 100 kuruş). Never store floats. */

const tryFormatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });

export function formatTRY(kurus: number): string {
  return tryFormatter.format(kurus / 100);
}

/** Round half up to the nearest kuruş. Only call at the END of a calculation. */
export function roundKurus(value: number): number {
  // Math.round rounds .5 up for positive numbers; guard tiny float noise (e.g. 1.4999999999).
  return Math.round(value + Number.EPSILON * Math.sign(value) * Math.max(1, Math.abs(value)));
}

/** Round UP to a multiple of `step` (e.g. 500 kuruş = 5 TL). */
export function ceilToStep(value: number, step: number): number {
  if (step <= 0) throw new Error('step must be positive');
  const q = value / step;
  // tolerate float noise so 25.000000001 steps does not jump to 26
  const rounded = Math.abs(q - Math.round(q)) < 1e-9 ? Math.round(q) : Math.ceil(q);
  return rounded * step;
}

/**
 * Parse a user typed TL amount ("12,50", "12.50", "1.250,75", "₺ 45") into kuruş.
 * Returns null when the input is not a valid non-negative amount.
 */
export function parseTRYInput(input: string): number | null {
  const s = input.replace(/[₺\s]|TL/gi, '').trim();
  if (!s) return null;
  let normalized: string;
  if (s.includes(',')) {
    // Turkish format: dots are thousand separators, comma is decimal
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else {
    const dots = s.split('.').length - 1;
    // "1.250" (3 decimals after single dot) is treated as thousands; "12.5" as decimal
    normalized = dots > 1 || /^\d{1,3}\.\d{3}$/.test(s) ? s.replace(/\./g, '') : s;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole = '0', frac = ''] = normalized.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

/** Kuruş → "12,50" (for editable inputs, no currency sign). */
export function kurusToInput(kurus: number): string {
  const sign = kurus < 0 ? '-' : '';
  const abs = Math.abs(kurus);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${sign}${whole}${frac ? ',' + String(frac).padStart(2, '0') : ''}`;
}

export function formatKg(grams: number): string {
  return `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(grams / 1000)} kg`;
}

export function formatPct(pct: number, fractionDigits = 1): string {
  return `%${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: fractionDigits, minimumFractionDigits: 0 }).format(pct)}`;
}
