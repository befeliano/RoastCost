/** Web preview only: localStorage instead of expo-sqlite (which needs special COOP/COEP headers on web). */
const ls = () => globalThis.localStorage;
const storage = {
  getItem: async (k: string) => ls()?.getItem(k) ?? null,
  setItem: async (k: string, v: string) => ls()?.setItem(k, v),
  removeItem: async (k: string) => ls()?.removeItem(k),
};

export const kv = {
  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const v = ls()?.getItem(key);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  async setJSON(key: string, value: unknown): Promise<void> {
    ls()?.setItem(key, JSON.stringify(value));
  },
  async remove(key: string): Promise<void> {
    ls()?.removeItem(key);
  },
  storage,
};
