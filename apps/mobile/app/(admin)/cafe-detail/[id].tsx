import { formatTrPhone } from '@roastcost/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, ApiError } from '@/api/client';
import type { AdminCafe } from '@/api/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Notice, Pill } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { SuccessOverlay } from '@/components/SuccessOverlay';
import { Text } from '@/components/Text';
import { CAFE_LABEL, CAFE_TONE } from '@/features/admin/labels';
import { formatDate } from '@/lib/format';
import { t } from '@/locales';
import { space } from '@/theme';
import { LoadState } from '@/components/LoadState';

export default function CafeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin', 'cafe', id],
    queryFn: () => api<AdminCafe>(`/admin/cafes/${id}`),
  });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const c = q.data;
  const act = async (action: 'approve' | 'reject' | 'suspend') => {
    setBusy(action);
    setError(null);
    try {
      await api(`/admin/cafes/${id}/${action}`, {
        method: 'POST',
        body: { note: note.trim() || null },
      });
      await q.refetch();
      void qc.invalidateQueries({ queryKey: ['admin'] });
      if (action === 'approve') setOk(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.unknownError'));
    } finally {
      setBusy(null);
    }
  };
  if (!c)
    return (
      <Screen title={t('admin.cafes')} back>
        <LoadState q={q} notFound={t('common.notFound')} />
      </Screen>
    );
  return (
    <Screen title={c.name} back>
      <Card style={styles.gap}>
        <Pill tone={CAFE_TONE[c.status]} label={CAFE_LABEL[c.status]} />
        <Text variant="body">
          {c.city} / {c.district}
        </Text>
        <Text variant="body">{formatTrPhone(c.phone)}</Text>
        {c.owner ? (
          <Text variant="small">
            {t('admin.owner')}: {c.owner.email} (
            {c.owner.emailVerified ? t('admin.verified') : t('admin.unverified')})
          </Text>
        ) : null}
        <Text variant="small">
          {formatDate(c.createdAt)} · {c.orderCount ?? 0} sipariş
        </Text>
        {c.statusNote ? <Text variant="small">“{c.statusNote}”</Text> : null}
      </Card>
      {error ? <Notice text={error} tone="danger" /> : null}
      <Field
        label={t('admin.note')}
        value={note}
        onChangeText={setNote}
        maxLength={500}
        multiline
      />
      <View style={styles.gap}>
        {c.status !== 'approved' ? (
          <Button
            title={t('admin.approve')}
            icon="check"
            onPress={() => act('approve')}
            loading={busy === 'approve'}
          />
        ) : null}
        {c.status === 'pending' ? (
          <Button
            title={t('admin.reject')}
            variant="danger"
            onPress={() => act('reject')}
            loading={busy === 'reject'}
          />
        ) : null}
        {c.status === 'approved' ? (
          <Button
            title={t('admin.suspend')}
            variant="danger"
            onPress={() => act('suspend')}
            loading={busy === 'suspend'}
          />
        ) : null}
      </View>
      <SuccessOverlay visible={ok} title={`${c.name} onaylandı`} onClose={() => setOk(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({ gap: { gap: space.sm } });
