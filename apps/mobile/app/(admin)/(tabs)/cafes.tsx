import type { CafeStatus } from '@roastcost/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api/client';
import type { AdminCafe, Page } from '@/api/types';
import { Chips, EmptyState, Pill, Row, RowGroup } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { CAFE_LABEL, CAFE_TONE } from '@/features/admin/labels';
import { formatDate } from '@/lib/format';
import { t } from '@/locales';
import { Field } from '@/components/Field';

export default function Cafes() {
  const [status, setStatus] = useState<CafeStatus | 'all'>('pending');
  const [qText, setQText] = useState('');
  const qn = qText.trim().toLocaleLowerCase('tr');
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
      <Field
        label={t('common.search')}
        hideLabel
        value={qText}
        onChangeText={setQText}
        placeholder={t('admin.searchCafes')}
        autoCapitalize="none"
      />
      {!q.data?.items.length && !q.isLoading ? <EmptyState title={t('admin.emptyCafes')} /> : null}
      <RowGroup>
        {(q.data?.items ?? [])
          .filter(
            (c) =>
              !qn ||
              `${c.name} ${c.district} ${c.ownerEmail ?? ''}`.toLocaleLowerCase('tr').includes(qn),
          )
          .map((c) => (
            <Row
              key={c.id}
              title={c.name}
              subtitle={`${c.district} · ${c.ownerEmail ?? ''} · ${formatDate(c.createdAt)}`}
              right={<Pill tone={CAFE_TONE[c.status]} label={CAFE_LABEL[c.status]} />}
              onPress={() => router.push({ pathname: '/cafe-detail/[id]', params: { id: c.id } })}
            />
          ))}
      </RowGroup>
    </Screen>
  );
}
