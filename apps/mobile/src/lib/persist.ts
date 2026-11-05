import { createJSONStorage } from 'zustand/middleware';
import { kv } from './kv';

/**
 * Options for persisted user preferences (theme, calculator choices, cart, hints).
 *
 * Preferences must survive app updates: without a `migrate`, zustand throws away anything saved
 * under an older `version`. Here every older version is carried over as-is and zustand's shallow
 * merge fills fields added later with their defaults — so bumping `version` never wipes a user.
 * `sanitize` can repair individual values that a newer build no longer accepts.
 */
export function persistOptions<T>(name: string, sanitize?: (state: Partial<T>) => Partial<T>) {
  return {
    name,
    version: 1,
    storage: createJSONStorage<T>(() => kv.storage),
    migrate: (persisted: unknown) => {
      const state = (persisted && typeof persisted === 'object' ? persisted : {}) as Partial<T>;
      return (sanitize ? sanitize(state) : state) as T;
    },
  };
}
