import * as Linking from 'expo-linking';
import { apiUrl } from '@/api/client';

export type LegalDoc = 'terms' | 'privacy' | 'kvkk';
/** Legal texts are served by the API (/legal/:doc) — the same URLs are given to the app stores. */
export function openLegal(doc: LegalDoc): void {
  void Linking.openURL(apiUrl(`/legal/${doc}`));
}
