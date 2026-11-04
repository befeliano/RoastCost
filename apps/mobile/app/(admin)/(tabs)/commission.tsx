import { formatOrderNo, formatTRY, type CommissionStatus } from '@roastcost/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api/client';
import type { AdminOrder, Page } from '@/api/types';
import { Chips, EmptyState, Pill, Row } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { COMMISSION_TONE } from '@/features/admin/labels';
import { formatDate } from '@/lib/format';
import { t } from '@/locales';

type Filter = CommissionStatus | 'all' | 'conflict';

export default function Commission() {
  const [f, setF] = useState<Filter>('pending');
  const qs = f === 'all' ? '' : f === 'conflict' ? '&conflict=true' : `&commission_status=${f}`;
  const q = useQuery({
    queryKey: ['admin', 'orders', f],
    queryFn: () => api<Page<AdminOrder>>(`/admin/orders?limit=100${qs}`),
  });
  return (
    <Screen
      title={t('admin.commission')}
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
    >
      <Chips
        options={[
          { value: 'pending' as const, label: t('admin.commissionStatus.pending') },
          { value: 'requested' as const, label: t('admin.commissionStatus.requested') },
          { value: 'paid' as const, label: t('admin.commissionStatus.paid') },
          { value: 'waived' as const, label: t('admin.commissionStatus.waived') },
          { value: 'conflict' as const, label: t('admin.conflicts') },
          { value: 'all' as const, label: t('catalog.all') },
        ]}
        value={f}
        onChange={setF}
      />
      {!q.data?.items.length && !q.isLoading ? <EmptyState title={t('empty.generic')} /> : null}
      {q.data?.items.map((o) => (
        <Row
          key={o.id}
          title={`${o.cafeName} → ${o.roasterName}`}
          subtitle={`${formatOrderNo(o.orderNo)} · ${formatDate(o.createdAt)} · ${t(`orders.status.${o.status}`)} · ${formatTRY(o.subtotalKurus)}`}
          right={
            o.commissionStatus !== 'not_applicable' ? (
              <Pill
                tone={COMMISSION_TONE[o.commissionStatus]}
                label={formatTRY(o.commissionAmountKurus ?? 0)}
              />
            ) : o.commissionConflict ? (
              <Pill tone="danger" icon="warning" label="!" />
            ) : undefined
          }
          onPress={() => router.push({ pathname: '/commission-order/[id]', params: { id: o.id } })}
        />
      ))}
    </Screen>
  );
}
