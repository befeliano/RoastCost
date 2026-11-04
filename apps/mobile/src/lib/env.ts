import Constants from 'expo-constants';

/**
 * API base URL. Override for a phone on the same Wi-Fi without editing files:
 *   EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 pnpm mobile
 */
export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:3000';
