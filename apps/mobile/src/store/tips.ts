import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { kv } from '@/lib/kv';

/** One-time hints the user can dismiss; remembered on the device. */
export const useTips = create<{ exploreTip: boolean; hide(): void }>()(
  persist((set) => ({ exploreTip: false, hide: () => set({ exploreTip: true }) }), {
    name: 'tips_v1',
    storage: createJSONStorage(() => kv.storage),
  }),
);
