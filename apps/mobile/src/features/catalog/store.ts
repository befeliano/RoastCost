import { create } from 'zustand';
import { api, ApiError } from '@/api/client';
import type { CatalogProduct, CatalogRoaster, CatalogSync, CatalogTier } from '@/api/types';
import { kv } from '@/lib/kv';
import { todayTr } from '@roastcost/shared';

const KEY = 'catalog_v3'; // v3: roaster order terms (0003) → force a full resync
const MIN_INTERVAL_MS = 5 * 60_000;

interface CatalogData {
  rev: number;
  syncedAt: string | null;
  roasters: Record<string, CatalogRoaster>;
  products: Record<string, CatalogProduct>;
  tiers: Record<string, CatalogTier>;
}

interface CatalogState extends CatalogData {
  loaded: boolean;
  syncing: boolean;
  error: string | null;
  load(): Promise<void>;
  sync(opts?: { force?: boolean }): Promise<void>;
  reset(): Promise<void>;
}

const empty: CatalogData = { rev: 0, syncedAt: null, roasters: {}, products: {}, tiers: {} };

function applyDelta<T extends { id: string; deletedAt: string | null }>(
  map: Record<string, T>,
  rows: T[],
): Record<string, T> {
  const next = { ...map };
  for (const r of rows) {
    if (r.deletedAt) delete next[r.id];
    else next[r.id] = r;
  }
  return next;
}

/**
 * Catalog cache with delta sync (spec §12.1): the device keeps `rev`, asks only for changes,
 * tombstones remove rows. Works offline from the last snapshot.
 */
/** bumped on sign-out; results of older syncs are discarded */
let generation = 0;

export const useCatalog = create<CatalogState>((set, get) => ({
  ...empty,
  loaded: false,
  syncing: false,
  error: null,

  async load() {
    if (get().loaded) return;
    const saved = await kv.getJSON<CatalogData>(KEY);
    set({ ...(saved ?? empty), loaded: true });
  },

  async sync(opts = {}) {
    await get().load();
    const s = get();
    if (s.syncing) return;
    if (!opts.force && s.syncedAt && Date.now() - new Date(s.syncedAt).getTime() < MIN_INTERVAL_MS)
      return;
    set({ syncing: true, error: null });
    const gen = generation;
    try {
      const d = await api<CatalogSync | undefined>(`/catalog/sync?since_rev=${s.rev}`);
      if (gen !== generation) return;
      const now = new Date().toISOString();
      const next: CatalogData = d
        ? {
            rev: d.rev,
            syncedAt: now,
            roasters: applyDelta(s.roasters, d.roasters),
            products: applyDelta(s.products, d.products),
            tiers: applyDelta(s.tiers, d.priceTiers),
          }
        : { rev: s.rev, syncedAt: now, roasters: s.roasters, products: s.products, tiers: s.tiers };
      set({ ...next, syncing: false });
      await kv.setJSON(KEY, next);
    } catch (e) {
      if (gen !== generation) return;
      set({ syncing: false, error: e instanceof ApiError ? e.code : 'unknown' });
    }
  },

  async reset() {
    generation++; // a sync still in flight for the previous account must not write back
    await kv.remove(KEY);
    set({ ...empty, loaded: true, syncing: false });
  },
}));

export function activeRoasters(s: CatalogData): CatalogRoaster[] {
  return Object.values(s.roasters)
    .filter((r) => r.isActive)
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

export function productsOf(s: CatalogData, roasterId: string): CatalogProduct[] {
  return Object.values(s.products)
    .filter((p) => p.roasterId === roasterId && p.isActive)
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

export function tiersOf(s: CatalogData, productId: string, today = todayTr()): CatalogTier[] {
  return Object.values(s.tiers)
    .filter((t) => t.productId === productId && (!t.validUntil || t.validUntil >= today))
    .sort((a, b) => a.minKg - b.minKg);
}
