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
      retry: (count, err) =>
        !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 3,
      retryDelay: (n) => Math.min(1000 * 2 ** n, 15_000),
    },
    mutations: { networkMode: 'online' },
  },
});

/** Persisted cache; `buster` changes when the cached shape changes so old caches are dropped. */
export const persister = createAsyncStoragePersister({ storage: kv.storage, key: 'rq_cache' });
export const CACHE_BUSTER = 'v1';
