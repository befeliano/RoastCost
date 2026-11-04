import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { AuditLog, Page } from '@/api/types';
import { Row } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { formatDateTime } from '@/lib/format';
import { t } from '@/locales';

export default function Audit() {
  const q = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () =>
      api<{ items: AuditLog[] } & Partial<Page<AuditLog>>>('/admin/audit-logs?limit=100'),
  });
  return (
    <Screen title={t('admin.audit')} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {q.data?.items.map((l) => (
        <Row
          key={l.id}
          title={l.action}
          subtitle={`${formatDateTime(l.createdAt)} · ${l.actor ?? 'sistem'} · ${l.entity}`}
        />
      ))}
    </Screen>
  );
}
