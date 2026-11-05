import {
  formatKg,
  formatOrderNo,
  formatTrPhone,
  kurusToInput,
  parseTRYInput,
  type CommissionStatus,
} from '@roastcost/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, ApiError } from '@/api/client';
import type { AdminOrder } from '@/api/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Notice, Pill, SectionTitle } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { COMMISSION_TONE } from '@/features/admin/labels';
import { formatDateTime, formatTRY } from '@/lib/format';
import { t } from '@/locales';
import { space } from '@/theme';

const NEXT: Record<CommissionStatus, CommissionStatus[]> = {
  not_applicable: [],
  pending: ['requested', 'paid', 'waived'],
  requested: ['paid', 'waived', 'pending'],
  paid: ['requested'],
  waived: ['pending'],
};

export default function CommissionOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: () => api<AdminOrder>(`/admin/orders/${id}`),
  });
  const [base, setBase] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const o = q.data;
  if (!o)
    return (
      <Screen title={t('admin.commission')} back>
        {null}
      </Screen>
    );

  const patch = async (path: string, body: object) => {
    setError(null);
    try {
      await api(`/admin/orders/${id}/${path}`, { method: 'PATCH', body });
      await q.refetch();
      void qc.invalidateQueries({ queryKey: ['admin'] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.unknownError'));
    }
  };

  return (
    <Screen
      title={formatOrderNo(o.orderNo)}
      back
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
    >
      {error ? <Notice text={error} tone="danger" /> : null}
      <Card style={styles.gap}>
        <Text variant="h3">
          {o.cafeName} → {o.roasterName}
        </Text>
        <Text variant="small">
          {formatTrPhone(o.cafePhone)} · {formatDateTime(o.createdAt)}
        </Text>
        <Pill label={t(`orders.status.${o.status}`)} />
        {o.items?.map((i) => (
          <Text key={i.productName} variant="body">
            • {i.productName} — {formatKg(i.quantityG)} · {formatTRY(i.lineTotalKurus)}
          </Text>
        ))}
        <Text variant="bodyStrong">
          {t('orders.subtotal')}: {formatTRY(o.subtotalKurus)}
        </Text>
        {o.roasterSaysNewCustomer !== null ? (
          <Text variant="small">
            Kavurucu beyanı: {o.roasterSaysNewCustomer ? 'yeni müşteri' : 'mevcut müşteri'}
          </Text>
        ) : null}
      </Card>
      {o.commissionConflict ? <Notice text={t('admin.conflict')} tone="danger" /> : null}

      <SectionTitle>{t('admin.commission')}</SectionTitle>
      <Card style={styles.gap}>
        <View style={styles.row}>
          <Pill
            tone={COMMISSION_TONE[o.commissionStatus]}
            label={t(`admin.commissionStatus.${o.commissionStatus}`)}
          />
          {o.isFirstOrder ? <Pill tone="primary" label={t('admin.firstOrder')} /> : null}
        </View>
        {o.commissionStatus !== 'not_applicable' ? (
          <>
            <Text variant="h2">{formatTRY(o.commissionAmountKurus ?? 0)}</Text>
            <Text variant="small">
              %{(o.commissionRateBp ?? 0) / 100} × {formatTRY(o.commissionBaseKurus ?? 0)}
            </Text>
            <Field
              label={t('admin.base')}
              value={base ?? kurusToInput(o.commissionBaseKurus ?? 0)}
              onChangeText={setBase}
              keyboardType="decimal-pad"
              suffix="₺"
            />
            <Field label={t('admin.note')} value={note} onChangeText={setNote} />
            <Button
              title={t('common.save')}
              variant="secondary"
              small
              onPress={() =>
                void patch('commission', {
                  ...(base !== null && parseTRYInput(base) !== null
                    ? { baseKurus: parseTRYInput(base) }
                    : {}),
                  ...(note ? { note } : {}),
                })
              }
            />
            <View style={styles.row}>
              {NEXT[o.commissionStatus].map((s) => (
                <Button
                  key={s}
                  title={t(`admin.commissionStatus.${s}`)}
                  small
                  style={styles.flex}
                  variant={s === 'paid' ? 'primary' : 'secondary'}
                  onPress={() => patch('commission', { status: s })}
                />
              ))}
            </View>
          </>
        ) : null}
        {o.commissionNote ? <Text variant="small">“{o.commissionNote}”</Text> : null}
      </Card>

      <SectionTitle>{t('admin.fixDecision')}</SectionTitle>
      <View style={styles.gap}>
        <Button
          title="Onaylandı · yeni müşteri"
          variant="secondary"
          small
          onPress={() =>
            void patch('decision', { status: 'confirmed', roasterSaysNewCustomer: true })
          }
        />
        <Button
          title="Onaylandı · mevcut müşteri"
          variant="secondary"
          small
          onPress={() =>
            void patch('decision', { status: 'confirmed', roasterSaysNewCustomer: false })
          }
        />
        <Button
          title="Karşılanamadı"
          variant="danger"
          small
          onPress={() => patch('decision', { status: 'declined' })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
});
