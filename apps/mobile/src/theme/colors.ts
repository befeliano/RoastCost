/** Neutral colours (spec §11.1). The accent colour comes from the selected palette — see palettes.ts. */
export const colors = {
  bg: '#FFFFFF',
  surface: '#F7F8F6',
  border: '#E4E7E3',
  text: '#1F2421',
  textMuted: '#5E6661', // WCAG AA on bg and surface
  coffee: '#3A2A22',
  success: '#1E7A46',
  warning: '#8F5E12',
  danger: '#B3261E',
  info: '#2F5D86',
  pin: '#D92D20', // map pins
  successBg: '#E7F5EC',
  warningBg: '#FBF1E1',
  dangerBg: '#FBEAE8',
  infoBg: '#E8F0F8',
} as const;
