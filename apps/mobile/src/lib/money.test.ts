import { describe, expect, it } from 'vitest';
import { formatGramsKg, formatTRY, formatTRYFull } from './format';

const nbsp = (s: string) => s.replace(/\s/g, ' ');

describe('money display', () => {
  it('drops ",00" for whole liras only', () => {
    expect(nbsp(formatTRY(110_000))).toBe(nbsp(formatTRYFull(110_000)).replace(',00', ''));
    expect(formatTRY(110_000)).not.toMatch(/,00/);
    expect(formatTRY(2_725)).toMatch(/27,25/);
    expect(formatTRY(350)).toMatch(/3,50/);
    expect(formatTRY(0)).not.toMatch(/,/);
  });
  it('keeps thousands separators', () => {
    expect(formatTRY(123_456_700)).toMatch(/1\.234\.567/);
  });
  it('full form always shows kuruş', () => {
    expect(formatTRYFull(1_200)).toMatch(/12,00/);
  });
  it('grams → kg text', () => {
    expect(formatGramsKg(2500)).toBe('2,5 kg');
    expect(formatGramsKg(5000)).toBe('5 kg');
  });
});
