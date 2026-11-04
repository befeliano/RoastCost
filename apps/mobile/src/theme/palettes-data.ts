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

export type PaletteKey = 'green' | 'sunset' | 'blue' | 'brown' | 'bordo';

/** Every pair is checked for WCAG AA in contrast.test.ts. */
export const PALETTES: Record<PaletteKey, Palette> = {
  green: {
    key: 'green',
    label: 'Orman & lime',
    primary: '#163300',
    primaryPressed: '#0D1F00',
    onPrimary: '#9FE870',
    primaryText: '#163300',
    primaryBg: '#E2F6D5',
    gradient: ['#0D1F00', '#2E6B12'],
    accent: '#9FE870',
    onAccent: '#163300',
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
  brown: {
    key: 'brown',
    label: 'Kahve',
    primary: '#7A4B2A',
    primaryPressed: '#5F3A20',
    onPrimary: '#FFFFFF',
    primaryText: '#7A4B2A',
    primaryBg: '#F5ECE4',
    gradient: ['#5C3519', '#8A5532'],
    accent: '#F2C36B',
    onAccent: '#3A2A22',
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
