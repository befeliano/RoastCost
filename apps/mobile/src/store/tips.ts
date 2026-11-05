import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistOptions } from '@/lib/persist';

/** One-time hints the user can dismiss; remembered on the device. */
export const useTips = create<{ exploreTip: boolean; hide(): void }>()(
  persist(
    (set) => ({ exploreTip: false, hide: () => set({ exploreTip: true }) }),
    persistOptions('tips_v1'),
  ),
);
