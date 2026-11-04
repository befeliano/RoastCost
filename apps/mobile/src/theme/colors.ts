/** Spec §11.1 — single place to change the brand colour (bordo vs koyu kahve). */
export const colors = {
  bg: '#FFFFFF',
  surface: '#FBF8F6',
  border: '#EADFD8',
  text: '#2B1F1A',
  textMuted: '#6E5F57', // darker than spec #7A6B63 to pass WCAG AA (4.5:1) on #FBF8F6 too
  primary: '#5E1A2B',
  primaryPressed: '#4A1422',
  onPrimary: '#FFFFFF',
  coffee: '#3A2A22',
  success: '#2F7D4F',
  warning: '#8F5E12', // darker than spec #B7791F for text contrast
  danger: '#B3261E',
  info: '#3B5B7A',
  successBg: '#EAF5EE',
  warningBg: '#FBF1E1',
  dangerBg: '#FBEAE8',
  primaryBg: '#F6ECEE',
} as const;
