import { describe, expect, it } from 'vitest';
import { colors } from './colors';
import { PALETTES } from './palettes-data';

/** WCAG 2.1 relative luminance / contrast ratio (spec §11.1: text ≥ 4.5:1). */
function lum(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const neutral: [string, string, string][] = [
  ['text on bg', colors.text, colors.bg],
  ['text on surface', colors.text, colors.surface],
  ['muted on bg', colors.textMuted, colors.bg],
  ['muted on surface', colors.textMuted, colors.surface],
  ['white on coffee (offline banner)', '#FFFFFF', colors.coffee],
  ['success on successBg', colors.success, colors.successBg],
  ['warning on warningBg', colors.warning, colors.warningBg],
  ['danger on dangerBg', colors.danger, colors.dangerBg],
  ['info on infoBg', colors.info, colors.infoBg],
  ['danger on bg', colors.danger, colors.bg],
];

describe('WCAG AA contrast — neutral colours', () => {
  it.each(neutral)('%s ≥ 4.5:1', (_n, fg, bg) =>
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5),
  );
});

describe.each(Object.values(PALETTES))('WCAG AA contrast — palette $label', (p) => {
  it('onPrimary on primary (top bar, buttons, chips)', () =>
    expect(contrast(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(4.5));
  it('primaryText on white (links, secondary buttons)', () =>
    expect(contrast(p.primaryText, colors.bg)).toBeGreaterThanOrEqual(4.5));
  it('primaryText on surface', () =>
    expect(contrast(p.primaryText, colors.surface)).toBeGreaterThanOrEqual(4.5));
  it('onPrimary on both gradient ends (header title is large text ≥ 3:1)', () => {
    for (const g of p.gradient) expect(contrast(p.onPrimary, g)).toBeGreaterThanOrEqual(3);
  });
  it('onAccent on accent (badges, active tab)', () =>
    expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5));
  it('primaryText on primaryBg (pills)', () =>
    expect(contrast(p.primaryText, p.primaryBg)).toBeGreaterThanOrEqual(4.5));
});
