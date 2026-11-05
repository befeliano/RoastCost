import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistOptions } from '@/lib/persist';

interface CostPrefs {
  recipeId: string | null;
  mode: 'catalog' | 'manual';
  productId: string | null;
  manualPricePerKgKurus: number | null;
  manualIncludesVat: boolean;
  manualVatRatePct: number;
  monthlyKg: number;
  set(p: Partial<Omit<CostPrefs, 'set'>>): void;
}

/** Calculator choices are remembered on the device. */
export const useCostPrefs = create<CostPrefs>()(
  persist(
    (set) => ({
      recipeId: null,
      mode: 'manual',
      productId: null,
      manualPricePerKgKurus: null,
      manualIncludesVat: false,
      manualVatRatePct: 10,
      monthlyKg: 5,
      set: (p) => set(p),
    }),
    persistOptions<CostPrefs>('cost_prefs_v1', (s) => ({
      ...s,
      // a bad value from an old build falls back to the default instead of breaking the screen
      monthlyKg: typeof s.monthlyKg === 'number' && s.monthlyKg > 0 ? s.monthlyKg : 5,
      mode: s.mode === 'catalog' ? 'catalog' : 'manual',
    })),
  ),
);
