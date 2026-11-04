import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { kv } from '@/lib/kv';
import { colors } from './colors';
import { PALETTES, type Palette, type PaletteKey } from './palettes-data';

export { PALETTES, type Palette, type PaletteKey };

interface ThemeState {
  palette: PaletteKey;
  setPalette(p: PaletteKey): void;
}

export const useThemeStore = create<ThemeState>()(
  persist((set) => ({ palette: 'green', setPalette: (palette) => set({ palette }) }), {
    name: 'theme_v1',
    storage: createJSONStorage(() => kv.storage),
  }),
);

export type ThemeColors = typeof colors & Palette;

/** Neutral colours + the user's accent palette. Components re-render when the palette changes. */
export function useColors(): ThemeColors {
  const key = useThemeStore((s) => s.palette);
  return { ...colors, ...PALETTES[key] };
}
