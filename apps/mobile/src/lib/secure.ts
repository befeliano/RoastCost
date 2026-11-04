import * as SecureStore from 'expo-secure-store';

/** Tokens only — iOS Keychain / Android Keystore. */
export const secure = {
  get: (k: string) => SecureStore.getItemAsync(k),
  set: (k: string, v: string) =>
    SecureStore.setItemAsync(k, v, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }),
  remove: (k: string) => SecureStore.deleteItemAsync(k),
};
