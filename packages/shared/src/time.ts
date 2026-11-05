/**
 * Today's date in Türkiye as YYYY-MM-DD — the business day for price validity, delivery dates and
 * "this month". Never `toISOString().slice(0, 10)`: that is the UTC date, which between 00:00 and
 * 03:00 Turkish time is still yesterday.
 */
export function todayTr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
