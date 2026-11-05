import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * API base URL. Override for a phone on the same Wi-Fi without editing files:
 *   EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 pnpm mobile
 */
export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:3000';

// A release build must talk to the real API over HTTPS. Shipping one that still points at localhost
// (or plain http) would fail on every request — fail loudly in testing instead.
// (The web build is only a local preview behind a dev proxy, so it is exempt.)
if (
  !__DEV__ &&
  Platform.OS !== 'web' &&
  process.env.NODE_ENV !== 'test' &&
  !API_URL.startsWith('https://')
) {
  throw new Error(
    `EXPO_PUBLIC_API_URL must be an https:// address in release builds (got "${API_URL}")`,
  );
}
