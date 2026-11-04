import Storage from 'expo-sqlite/kv-store';

/** Device cache (spec §12.1). Never store passwords or tokens here — tokens live in SecureStore. */
export const kv = {
  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const v = await Storage.getItem(key);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  async setJSON(key: string, value: unknown): Promise<void> {
    await Storage.setItem(key, JSON.stringify(value));
  },
  async remove(key: string): Promise<void> {
    await Storage.removeItem(key);
  },
  storage: Storage,
};
