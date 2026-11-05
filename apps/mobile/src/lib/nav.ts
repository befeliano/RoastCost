import { router } from 'expo-router';

let last = 0;

/**
 * router.push with a short tap guard: a double tap on a card/row must not open the same screen twice.
 */
export const nav = {
  push(...args: Parameters<typeof router.push>) {
    const now = Date.now();
    if (now - last < 600) return;
    last = now;
    router.push(...args);
  },
};
