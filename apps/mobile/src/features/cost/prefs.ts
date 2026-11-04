import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { kv } from '@/lib/kv';

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
    { name: 'cost_prefs_v1', storage: createJSONStorage(() => kv.storage) },
  ),
);
