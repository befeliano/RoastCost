/** Web preview only (screenshots / browser testing). Native builds use secure.ts (Keychain/Keystore). */
export const secure = {
  get: async (k: string) => globalThis.localStorage?.getItem(k) ?? null,
  set: async (k: string, v: string) => globalThis.localStorage?.setItem(k, v),
  remove: async (k: string) => globalThis.localStorage?.removeItem(k),
};
