/** Accent palettes (pure data — no React Native imports, used by tests too). */
export interface Palette {
  key: PaletteKey;
  label: string;
  /** fills: primary buttons, selected chips */
  primary: string;
  primaryPressed: string;
  /** text/icons on top of `primary` and on the header gradient */
  onPrimary: string;
  /** accent used as text/border on white (links, secondary buttons) */
  primaryText: string;
  /** soft tint behind accent content */
  primaryBg: string;
  /** header / hero / primary button gradient (start → end) */
  gradient: [string, string];
  /** high-energy highlight (badges, active tab pill, hero chips) and the text drawn on it */
  accent: string;
  onAccent: string;
}

export type PaletteKey = 'coffee' | 'sunset' | 'blue' | 'bordo';

/** Every pair is checked for WCAG AA in contrast.test.ts. */
export const PALETTES: Record<PaletteKey, Palette> = {
  coffee: {
    key: 'coffee',
    label: 'Kahve',
    primary: '#5C3A21',
    primaryPressed: '#472C18',
    onPrimary: '#FFFFFF',
    primaryText: '#5C3A21',
    primaryBg: '#F4EBE2',
    gradient: ['#3B2416', '#A0714A'],
    accent: '#F2C36B',
    onAccent: '#3B2416',
  },
  sunset: {
    key: 'sunset',
    label: 'Gün batımı',
    primary: '#FF8A1F',
    primaryPressed: '#F07400',
    onPrimary: '#2A1300',
    primaryText: '#A84A00',
    primaryBg: '#FFF1E2',
    gradient: ['#FFC23D', '#FF7A2F'],
    accent: '#FFE27A',
    onAccent: '#2A1300',
  },
  blue: {
    key: 'blue',
    label: 'Açık mavi',
    primary: '#38A8E0',
    primaryPressed: '#2B8FC2',
    onPrimary: '#06273A',
    primaryText: '#0B6E9E',
    primaryBg: '#E3F3FB',
    gradient: ['#7FD0F5', '#38A8E0'],
    accent: '#FADC65',
    onAccent: '#06273A',
  },
  bordo: {
    key: 'bordo',
    label: 'Bordo',
    primary: '#5E1A2B',
    primaryPressed: '#4A1422',
    onPrimary: '#FFFFFF',
    primaryText: '#5E1A2B',
    primaryBg: '#F6ECEE',
    gradient: ['#4A1422', '#7A2238'],
    accent: '#FFB8C6',
    onAccent: '#4A1422',
  },
};
