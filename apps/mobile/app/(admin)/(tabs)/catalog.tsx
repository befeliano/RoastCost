import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { AdminRoaster } from '@/api/types';
import { Button } from '@/components/Button';
import { EmptyState, Pill, Row, RowGroup } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { formatDate } from '@/lib/format';
import { t } from '@/locales';
import { Field } from '@/components/Field';
import { useState } from 'react';
import { nav } from '@/lib/nav';

export default function Catalog() {
  const [qText, setQText] = useState('');
  const qn = qText.trim().toLocaleLowerCase('tr');
  const q = useQuery({
    queryKey: ['admin', 'roasters'],
    queryFn: () => api<AdminRoaster[]>('/admin/roasters'),
  });
  return (
    <Screen
      title={t('admin.roasters')}
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
    >
      <Button
        title={t('admin.newRoaster')}
        icon="plus"
        variant="secondary"
        onPress={() => nav.push({ pathname: '/roaster-edit/[id]', params: { id: 'new' } })}
      />
      <Field
        label={t('common.search')}
        hideLabel
        value={qText}
        onChangeText={setQText}
        placeholder={t('admin.searchRoasters')}
      />
      {!q.data?.length && !q.isLoading ? <EmptyState title={t('catalog.empty')} /> : null}
      <RowGroup>
        {(q.data ?? [])
          .filter(
            (r) => !qn || `${r.name} ${r.district ?? ''}`.toLocaleLowerCase('tr').includes(qn),
          )
          .map((r) => (
            <Row
              key={r.id}
              title={r.name}
              subtitle={[
                `${r.productCount} ürün · %${r.commissionRateBp / 100} komisyon`,
                r.pricesUpdatedAt ? `fiyatlar ${formatDate(r.pricesUpdatedAt)}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              right={r.isActive ? undefined : <Pill label="Pasif" />}
              onPress={() => nav.push({ pathname: '/roaster-edit/[id]', params: { id: r.id } })}
            />
          ))}
      </RowGroup>
    </Screen>
  );
}
