import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { kv } from '@/lib/kv';

export interface RoasterCart {
  /** productId → grams */
  items: Record<string, number>;
  date: string | null;
  note: string;
}

interface CartState {
  carts: Record<string, RoasterCart>;
  setQuantity(roasterId: string, productId: string, grams: number): void;
  remove(roasterId: string, productId: string): void;
  setMeta(roasterId: string, meta: Partial<Pick<RoasterCart, 'date' | 'note'>>): void;
  clear(roasterId: string): void;
  clearAll(): void;
}

/** One cart per roaster (spec K4), persisted on the device. */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      carts: {},
      setQuantity: (roasterId, productId, grams) =>
        set((s) => {
          const cart = s.carts[roasterId] ?? { items: {}, date: null, note: '' };
          return {
            carts: {
              ...s.carts,
              [roasterId]: {
                ...cart,
                items: { ...cart.items, [productId]: Math.max(0, Math.round(grams)) },
              },
            },
          };
        }),
      remove: (roasterId, productId) =>
        set((s) => {
          const cart = s.carts[roasterId];
          if (!cart) return s;
          const items = { ...cart.items };
          delete items[productId];
          const carts = { ...s.carts };
          if (Object.keys(items).length) carts[roasterId] = { ...cart, items };
          else delete carts[roasterId];
          return { carts };
        }),
      setMeta: (roasterId, meta) =>
        set((s) => {
          const cart = s.carts[roasterId];
          return cart ? { carts: { ...s.carts, [roasterId]: { ...cart, ...meta } } } : s;
        }),
      clear: (roasterId) =>
        set((s) => {
          const carts = { ...s.carts };
          delete carts[roasterId];
          return { carts };
        }),
      clearAll: () => set({ carts: {} }),
    }),
    { name: 'cart_v1', storage: createJSONStorage(() => kv.storage) },
  ),
);
