import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { colors } from './colors';
import { PALETTES, type Palette, type PaletteKey } from './palettes-data';
import { persistOptions } from '@/lib/persist';

export { PALETTES, type Palette, type PaletteKey };

interface ThemeState {
  palette: PaletteKey;
  setPalette(p: PaletteKey): void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({ palette: 'coffee', setPalette: (palette) => set({ palette }) }),
    persistOptions('theme_v1'),
  ),
);

export type ThemeColors = typeof colors & Palette;

/** Neutral colours + the user's accent palette. Components re-render when the palette changes. */
export function useColors(): ThemeColors {
  const key = useThemeStore((s) => s.palette);
  // older installs may have a removed palette key stored ('green', 'brown') → default
  return { ...colors, ...(PALETTES[key] ?? PALETTES.coffee) };
}
