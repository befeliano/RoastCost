/**
 * Turkish mobile numbers → E.164 (+905XXXXXXXXX).
 * Accepts: "0532 123 45 67", "532 123 45 67", "+90 532 123 4567", "90532...", "(0532) 123-45-67".
 * WhatsApp ordering needs a mobile line, so only 5xx numbers are accepted (see docs/DECISIONS.md).
 */
export function normalizeTrPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  let national: string;
  if (digits.startsWith('+')) {
    if (!digits.startsWith('+90')) return null;
    national = digits.slice(3);
  } else if (digits.startsWith('0090')) {
    national = digits.slice(4);
  } else if (digits.startsWith('90') && digits.length === 12) {
    national = digits.slice(2);
  } else if (digits.startsWith('0')) {
    national = digits.slice(1);
  } else {
    national = digits;
  }
  if (!/^5\d{9}$/.test(national)) return null;
  return `+90${national}`;
}

export const E164_RE = /^\+[1-9][0-9]{7,14}$/;

/** +905321234567 → "0532 123 45 67" */
export function formatTrPhone(e164: string): string {
  const m = /^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  return m ? `0${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164;
}

/** Mask for logs: +905321234567 → +90532*****67 */
export function maskPhone(e164: string): string {
  return e164.length > 8 ? e164.slice(0, 6) + '*'.repeat(e164.length - 8) + e164.slice(-2) : '***';
}
