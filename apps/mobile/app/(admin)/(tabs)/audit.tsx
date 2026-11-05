import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { AuditLog, Page } from '@/api/types';
import { EmptyState, Row, RowGroup } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { formatDateTime } from '@/lib/format';
import { t } from '@/locales';
import { LoadState } from '@/components/LoadState';

const AUDIT_LABEL: Record<string, string> = {
  'account.delete': 'Hesap silindi',
  'cafe.update': 'Kafe güncellendi',
  insert: 'Kayıt eklendi',
  'order.commission': 'Komisyon durumu değişti',
  'order.decision_fix': 'Sipariş kararı düzeltildi',
  'order.roaster_confirm': 'Kavurucu siparişi onayladı',
  'order.roaster_decline': 'Kavurucu siparişi reddetti',
  'price.create': 'Fiyat kademesi eklendi',
  'price.delete': 'Fiyat kademesi silindi',
  'price.import': 'Toplu fiyat içe aktarıldı',
  'price.rollback': 'Fiyat geri alındı',
  'price.update': 'Fiyat güncellendi',
  'product.create': 'Ürün eklendi',
  'product.delete': 'Ürün silindi',
  'product.update': 'Ürün güncellendi',
  'roaster.create': 'Kavurucu eklendi',
  'roaster.delete': 'Kavurucu silindi',
  'roaster.update': 'Kavurucu güncellendi',
};

export default function Audit() {
  const q = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () =>
      api<{ items: AuditLog[] } & Partial<Page<AuditLog>>>('/admin/audit-logs?limit=100'),
  });
  return (
    <Screen title={t('admin.audit')} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <LoadState q={q} />
      {q.data && !q.data.items.length ? <EmptyState title={t('admin.auditEmpty')} /> : null}
      <RowGroup>
        {q.data?.items.map((l) => (
          <Row
            key={l.id}
            title={AUDIT_LABEL[l.action] ?? l.action}
            subtitle={`${formatDateTime(l.createdAt)} · ${l.actor ?? 'sistem'} · ${l.entity}`}
          />
        ))}
      </RowGroup>
    </Screen>
  );
}
