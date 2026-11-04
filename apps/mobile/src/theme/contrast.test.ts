import { describe, expect, it } from 'vitest';
import { colors } from './colors';

/** WCAG 2.1 relative luminance / contrast ratio (spec §11.1: text ≥ 4.5:1). */
function lum(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const pairs: [string, string, string][] = [
  ['text on bg', colors.text, colors.bg],
  ['text on surface', colors.text, colors.surface],
  ['muted on bg', colors.textMuted, colors.bg],
  ['muted on surface', colors.textMuted, colors.surface],
  ['onPrimary on primary (top bar, buttons)', colors.onPrimary, colors.primary],
  ['primary on bg (secondary buttons, links)', colors.primary, colors.bg],
  ['onPrimary on coffee (offline banner)', colors.onPrimary, colors.coffee],
  ['success on successBg', colors.success, colors.successBg],
  ['warning on warningBg', colors.warning, colors.warningBg],
  ['danger on dangerBg', colors.danger, colors.dangerBg],
  ['primary on primaryBg', colors.primary, colors.primaryBg],
  ['danger on bg', colors.danger, colors.bg],
];

describe('WCAG AA contrast', () => {
  it.each(pairs)('%s ≥ 4.5:1', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
