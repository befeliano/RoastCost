/** Neutral colours (spec §11.1). The accent colour comes from the selected palette — see palettes.ts. */
export const colors = {
  bg: '#FFFFFF',
  surface: '#F5F1EB',
  border: '#E6DED4',
  text: '#221B16',
  textMuted: '#6B5E54', // WCAG AA on bg and surface
  coffee: '#3A2A22',
  success: '#1E7A46',
  warning: '#8F5E12',
  danger: '#B3261E',
  info: '#2F5D86',
  pin: '#D92D20', // map pins
  // warm decorative blobs (sun → orange → coral), never used for text
  sun: '#FFD23F',
  orange: '#FF9F43',
  coral: '#FF6B6B',
  successBg: '#E7F5EC',
  warningBg: '#FBF1E1',
  dangerBg: '#FBEAE8',
  infoBg: '#E8F0F8',
} as const;
