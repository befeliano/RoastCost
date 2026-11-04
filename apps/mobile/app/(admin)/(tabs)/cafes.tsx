import type { CafeStatus } from '@roastcost/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api/client';
import type { AdminCafe, Page } from '@/api/types';
import { Chips, EmptyState, Pill, Row } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { CAFE_LABEL, CAFE_TONE } from '@/features/admin/labels';
import { formatDate } from '@/lib/format';
import { t } from '@/locales';

export default function Cafes() {
  const [status, setStatus] = useState<CafeStatus | 'all'>('pending');
  const q = useQuery({
    queryKey: ['admin', 'cafes', status],
    queryFn: () =>
      api<Page<AdminCafe>>(`/admin/cafes?limit=100${status === 'all' ? '' : `&status=${status}`}`),
  });
  return (
    <Screen title={t('admin.cafes')} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <Chips
        options={[
          { value: 'pending' as const, label: CAFE_LABEL.pending },
          { value: 'approved' as const, label: CAFE_LABEL.approved },
          { value: 'suspended' as const, label: CAFE_LABEL.suspended },
          { value: 'rejected' as const, label: CAFE_LABEL.rejected },
          { value: 'all' as const, label: t('catalog.all') },
        ]}
        value={status}
        onChange={setStatus}
      />
      {!q.data?.items.length && !q.isLoading ? <EmptyState title={t('admin.emptyCafes')} /> : null}
      {q.data?.items.map((c) => (
        <Row
          key={c.id}
          title={c.name}
          subtitle={`${c.district} · ${c.ownerEmail ?? ''} · ${formatDate(c.createdAt)}`}
          right={<Pill tone={CAFE_TONE[c.status]} label={CAFE_LABEL[c.status]} />}
          onPress={() => router.push({ pathname: '/cafe-detail/[id]', params: { id: c.id } })}
        />
      ))}
    </Screen>
  );
}
