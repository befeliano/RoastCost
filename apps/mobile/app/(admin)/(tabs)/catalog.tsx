import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/api/client';
import type { AdminRoaster } from '@/api/types';
import { Button } from '@/components/Button';
import { EmptyState, Pill, Row, RowGroup } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { formatDate } from '@/lib/format';
import { t } from '@/locales';

export default function Catalog() {
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
        onPress={() => router.push({ pathname: '/roaster-edit/[id]', params: { id: 'new' } })}
      />
      {!q.data?.length && !q.isLoading ? <EmptyState title={t('catalog.empty')} /> : null}
      <RowGroup>
        {q.data?.map((r) => (
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
            onPress={() => router.push({ pathname: '/roaster-edit/[id]', params: { id: r.id } })}
          />
        ))}
      </RowGroup>
    </Screen>
  );
}
