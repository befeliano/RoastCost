/** Accent palettes (pure data — no React Native imports, used by tests too). */
export interface Palette {
  key: PaletteKey;
  label: string;
  /** fills: top bar, primary buttons, selected chips */
  primary: string;
  primaryPressed: string;
  /** text/icons on top of `primary` */
  onPrimary: string;
  /** accent used as text/border on white (links, secondary buttons) */
  primaryText: string;
  /** soft tint behind accent content */
  primaryBg: string;
}

export type PaletteKey = 'green' | 'blue' | 'brown' | 'bordo';

/** Every pair is checked for WCAG AA in contrast.test.ts. */
export const PALETTES: Record<PaletteKey, Palette> = {
  green: {
    key: 'green',
    label: 'Yeşil',
    primary: '#12874A',
    primaryPressed: '#0E6E3C',
    onPrimary: '#FFFFFF',
    primaryText: '#0D7640',
    primaryBg: '#E3F6EA',
  },
  blue: {
    key: 'blue',
    label: 'Açık mavi',
    primary: '#38A8E0',
    primaryPressed: '#2B8FC2',
    onPrimary: '#06273A',
    primaryText: '#0B6E9E',
    primaryBg: '#E3F3FB',
  },
  brown: {
    key: 'brown',
    label: 'Kahverengi',
    primary: '#7A4B2A',
    primaryPressed: '#5F3A20',
    onPrimary: '#FFFFFF',
    primaryText: '#7A4B2A',
    primaryBg: '#F5ECE4',
  },
  bordo: {
    key: 'bordo',
    label: 'Bordo',
    primary: '#5E1A2B',
    primaryPressed: '#4A1422',
    onPrimary: '#FFFFFF',
    primaryText: '#5E1A2B',
    primaryBg: '#F6ECEE',
  },
};
