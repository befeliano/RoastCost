import { formatTRY as formatTRYFull } from '@roastcost/shared';

/** Full form, always with kuruş ("₺3,50", "₺12,00") — for cost breakdowns where columns must align. */
export { formatTRYFull };

/** Display form: whole liras drop ",00" ("₺1.100", "₺27,25"). */
export function formatTRY(kurus: number): string {
  return kurus % 100 === 0 ? formatTRYFull(kurus).replace(/,00(?=\D*$)/, '') : formatTRYFull(kurus);
}

/** 2500 g → "2,5 kg" */
export function formatGramsKg(g: number): string {
  return `${String(Math.round(g) / 1000).replace('.', ',')} kg`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function daysSince(iso: string, now = Date.now()): number {
  return Math.floor((now - new Date(iso).getTime()) / 86_400_000);
}

export function formatRelative(iso: string, now = Date.now()): string {
  const min = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} sa önce`;
  return formatDate(iso);
}

/** "2,5" → 2500 g ; returns null when invalid. */
export function parseKgToGrams(input: string): number | null {
  const n = Number(input.replace(',', '.').trim());
  if (!Number.isFinite(n) || n <= 0 || n > 1000) return null;
  return Math.round(n * 1000);
}

export function gramsToKgInput(g: number): string {
  return String(g / 1000).replace('.', ',');
}

export function parseDecimal(input: string): number | null {
  const s = input.replace(',', '.').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
