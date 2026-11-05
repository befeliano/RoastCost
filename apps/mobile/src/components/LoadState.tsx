import { ApiError } from '@/api/client';
import { ErrorState, EmptyState } from './Misc';
import { Skeleton } from './Skeleton';

interface QueryLike {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  data: unknown;
  refetch: () => unknown;
}

/**
 * The non-happy paths of a data screen in one place: skeleton while loading, error + retry when the
 * request failed and nothing is cached, and (optionally) a "not found" message. Renders nothing when
 * there is data to show.
 */
export function LoadState({
  q,
  rows = 3,
  notFound,
}: {
  q: QueryLike;
  rows?: number;
  /** pass when the caller already knows the item is missing (data loaded but no match) */
  notFound?: string | false;
}) {
  if (q.isLoading) return <Skeleton rows={rows} />;
  if (q.isError && !q.data) {
    const e = q.error instanceof ApiError ? q.error : null;
    if (e?.status === 404)
      return <EmptyState title="Bulunamadı" body="Silinmiş ya da artık erişilemiyor olabilir." />;
    // network problems get the default "check your connection"; anything else says what happened
    return (
      <ErrorState
        onRetry={() => void q.refetch()}
        text={e && e.status !== 0 ? e.message : undefined}
      />
    );
  }
  if (notFound)
    return <EmptyState title={notFound} body="Silinmiş ya da artık erişilemiyor olabilir." />;
  return null;
}
