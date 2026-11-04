import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { api, ApiError } from '@/api/client';
import type { ImportResult } from '@/api/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Notice, Pill } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { SuccessOverlay } from '@/components/SuccessOverlay';
import { Text } from '@/components/Text';
import { t } from '@/locales';
import { formatTRY } from '@/lib/format';

const LABEL: Record<string, { label: string; tone: 'success' | 'info' | 'warning' | 'neutral' }> = {
  create_product: { label: 'Yeni ürün', tone: 'success' },
  create_tier: { label: 'Yeni kademe', tone: 'info' },
  update_price: { label: 'Fiyat değişiyor', tone: 'warning' },
  unchanged: { label: 'Aynı', tone: 'neutral' },
};

/** Paste → dry-run preview → apply (spec §9 toplu içe aktarma). */
export default function PriceImport() {
  const { roasterId } = useLocalSearchParams<{ roasterId: string }>();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [res, setRes] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const run = async (dryRun: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const r = await api<ImportResult>(`/admin/roasters/${roasterId}/prices/import`, {
        method: 'POST',
        body: { text, dryRun },
      });
      setRes(r);
      if (r.applied) {
        setDone(true);
        void qc.invalidateQueries({ queryKey: ['admin'] });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title={t('admin.import')}
      back
      footer={
        <>
          <Button
            title={t('admin.preview')}
            variant="secondary"
            onPress={() => void run(true)}
            loading={busy}
            disabled={!text.trim()}
          />
          <Button
            title={t('admin.apply')}
            onPress={() => void run(false)}
            disabled={!res || res.errors.length > 0 || busy}
          />
        </>
      }
    >
      <Text variant="small">{t('admin.importHint')}</Text>
      <Field
        label="Fiyat listesi"
        value={text}
        onChangeText={(v) => {
          setText(v);
          setRes(null);
        }}
        multiline
        numberOfLines={8}
        style={{ minHeight: 160, textAlignVertical: 'top' }}
        placeholder={'Ev Harmanı;espresso;1;950\nEv Harmanı;espresso;5;890'}
        autoCapitalize="none"
      />
      {error ? <Notice text={error} tone="danger" /> : null}
      {res ? (
        <>
          <Notice text={t('admin.importSummary', res.summary)} tone="info" icon="list" />
          {res.errors.length ? (
            <Notice text={t('admin.importErrors', { n: res.errors.length })} tone="danger" />
          ) : null}
          {res.errors.map((e) => (
            <Card key={`e${e.line}`}>
              <Text variant="bodyStrong">
                Satır {e.line}: {e.message}
              </Text>
              <Text variant="small">{e.raw}</Text>
            </Card>
          ))}
          {res.plan.map((p) => (
            <Card key={`p${p.line}`} style={{ gap: 4 }}>
              <Pill
                tone={LABEL[p.action]?.tone ?? 'neutral'}
                label={LABEL[p.action]?.label ?? p.action}
              />
              <Text variant="bodyStrong">
                {p.productName} · {p.minKg} kg+
              </Text>
              <Text variant="small">
                {p.oldPriceKurus !== null ? `${formatTRY(p.oldPriceKurus)} → ` : ''}
                {formatTRY(p.pricePerKgKurus)}
              </Text>
            </Card>
          ))}
        </>
      ) : null}
      <SuccessOverlay visible={done} title="Fiyatlar güncellendi" onClose={() => setDone(false)} />
    </Screen>
  );
}
