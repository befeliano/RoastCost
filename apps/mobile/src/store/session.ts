import { create } from 'zustand';
import {
  api,
  ApiError,
  clearSession,
  getRefreshToken,
  onSessionExpired,
  saveSession,
} from '@/api/client';
import type { Me, Session } from '@/api/types';
import { kv } from '@/lib/kv';

const ME_CACHE = 'me_v1';

type Status = 'booting' | 'signedOut' | 'signedIn';

interface SessionState {
  status: Status;
  me: Me | null;
  bootstrap(): Promise<void>;
  signIn(s: Session): Promise<void>;
  refreshMe(): Promise<Me | null>;
  signOut(): Promise<void>;
}

export const useSession = create<SessionState>((set, get) => ({
  status: 'booting',
  me: null,

  /** Cache-first: show the cached profile immediately, refresh in the background (spec §12.1). */
  async bootstrap() {
    const rt = await getRefreshToken();
    if (!rt) {
      set({ status: 'signedOut', me: null });
      return;
    }
    const cached = await kv.getJSON<Me>(ME_CACHE);
    if (cached) set({ status: 'signedIn', me: cached });
    const fresh = await get().refreshMe();
    if (!fresh && !cached) set({ status: (await getRefreshToken()) ? 'signedIn' : 'signedOut' });
  },

  async signIn(s) {
    await saveSession(s);
    const me = await get().refreshMe();
    if (me) set({ status: 'signedIn' });
  },

  async refreshMe() {
    try {
      const me = await api<Me>('/me');
      await kv.setJSON(ME_CACHE, me);
      set({ me, status: 'signedIn' });
      return me;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await get().signOut();
      return null;
    }
  },

  async signOut() {
    const rt = await getRefreshToken();
    if (rt)
      api('/auth/logout', { method: 'POST', body: { refreshToken: rt }, auth: false }).catch(
        () => {},
      );
    await clearSession();
    await kv.remove(ME_CACHE);
    set({ status: 'signedOut', me: null });
  },
}));

onSessionExpired(() => {
  void useSession.getState().signOut();
});
