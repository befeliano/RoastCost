import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';
import { api, ApiError } from '@/api/client';
import type { PriceHistory } from '@/api/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { formatDateTime, formatTRY } from '@/lib/format';
import { t } from '@/locales';

const ACTION: Record<
  PriceHistory['action'],
  { label: string; tone: 'info' | 'warning' | 'danger' | 'success' }
> = {
  insert: { label: 'Eklendi', tone: 'success' },
  update: { label: 'Değişti', tone: 'info' },
  delete: { label: 'Silindi', tone: 'danger' },
  rollback: { label: 'Geri alındı', tone: 'warning' },
};
const money = (k: number | null) => (k === null ? '—' : formatTRY(k));

/** Price history + rollback (spec K8). */
export default function TierHistory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin', 'history', id],
    queryFn: () => api<PriceHistory[]>(`/admin/price-tiers/${id}/history`),
  });
  const rollback = (h: PriceHistory) =>
    Alert.alert(
      t('admin.rollbackConfirm'),
      `${money(h.oldPriceKurus)} ← ${money(h.newPriceKurus)}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.rollback'),
          onPress: async () => {
            try {
              await api(`/admin/price-history/${h.id}/rollback`, { method: 'POST' });
              void q.refetch();
              void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
            } catch (e) {
              Alert.alert(e instanceof ApiError ? e.message : t('common.unknownError'));
            }
          },
        },
      ],
    );
  return (
    <Screen
      title={t('admin.history')}
      back
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
    >
      {q.data?.map((h) => (
        <Card key={h.id} style={{ gap: 6 }}>
          <Pill tone={ACTION[h.action].tone} label={`${ACTION[h.action].label} · ${h.minKg} kg+`} />
          <Text variant="h3">
            {money(h.oldPriceKurus)} → {money(h.newPriceKurus)}
          </Text>
          <Text variant="small">
            {formatDateTime(h.changedAt)} · {h.changedBy ?? 'sistem'}
            {h.reason ? ` · “${h.reason}”` : ''}
          </Text>
          <Button
            title={t('admin.rollback')}
            icon="history"
            variant="secondary"
            small
            onPress={() => rollback(h)}
          />
        </Card>
      ))}
    </Screen>
  );
}
