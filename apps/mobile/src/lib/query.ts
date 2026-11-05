import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { kv } from './kv';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      staleTime: 60_000,
      gcTime: 7 * 24 * 60 * 60_000, // keep for the persisted cache
      // network/5xx/429 → retry with exponential backoff; other 4xx are final (retrying won't help)
      retry: (count, err) =>
        count < 3 &&
        !(err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 429),
      retryDelay: (n, err) =>
        err instanceof ApiError && err.status === 429
          ? Math.min(5_000 * 2 ** n, 60_000)
          : Math.min(1000 * 2 ** n, 15_000),
    },
    mutations: { networkMode: 'online' },
  },
});

/** Persisted cache; `buster` changes when the cached shape changes so old caches are dropped. */
export const persister = createAsyncStoragePersister({ storage: kv.storage, key: 'rq_cache' });
// v2: order history became an infinite query (pages) — old cached shape is dropped, data refetches
export const CACHE_BUSTER = 'v2';
