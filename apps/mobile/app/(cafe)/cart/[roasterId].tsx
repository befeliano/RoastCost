import { formatTRY, lineTotalKurus, selectTier } from '@roastcost/shared';
import { useNetworkState } from 'expo-network';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, ApiError } from '@/api/client';
import type { OrderCreated } from '@/api/types';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Chips, Notice } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { SuccessOverlay } from '@/components/SuccessOverlay';
import { Text } from '@/components/Text';
import { tiersOf, useCatalog } from '@/features/catalog/store';
import { useSendFlow } from '@/features/orders/useSendFlow';
import { gramsToKgInput, parseKgToGrams } from '@/lib/format';
import { t } from '@/locales';
import { useCart } from '@/store/cart';
import { useSession } from '@/store/session';
import { space } from '@/theme';

function nextDays(n: number) {
  const fmt = new Intl.DateTimeFormat('tr-TR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { value: iso, label: fmt.format(d) };
  });
}

export default function Cart() {
  const { roasterId } = useLocalSearchParams<{ roasterId: string }>();
  const catalog = useCatalog();
  const cart = useCart((s) => s.carts[roasterId]);
  const { setQuantity, remove, setMeta, clear } = useCart.getState();
  const verified = useSession((s) => s.me?.user.emailVerified);
  const net = useNetworkState();
  const offline = net.isConnected === false || net.isInternetReachable === false;
  const flow = useSendFlow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kgEdit, setKgEdit] = useState<Record<string, string>>({});
  const days = useMemo(() => nextDays(7), []);
  const roaster = catalog.roasters[roasterId];

  const lines = Object.entries(cart?.items ?? {}).map(([productId, grams]) => {
    const product = catalog.products[productId];
    const tiers = tiersOf(catalog, productId);
    const tier = selectTier(tiers, grams / 1000);
    return {
      productId,
      grams,
      product,
      tier,
      minKg: tiers[0]?.minKg,
      total: tier ? lineTotalKurus(grams, tier.pricePerKgKurus) : 0,
    };
  });
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const invalid = lines.some((l) => !l.tier || !l.product);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await api<OrderCreated>('/orders', {
        method: 'POST',
        body: {
          roasterId,
          items: lines.map((l) => ({ productId: l.productId, quantityG: l.grams })),
          requestedDeliveryDate: cart?.date ?? null,
          note: cart?.note?.trim() || null,
        },
      });
      clear(roasterId); // the order now holds the items
      const opened = await flow.open(created);
      if (!opened) setError(t('orders.waMissing'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.unknownError'));
      if (e instanceof ApiError && e.code === 'product_unavailable')
        void catalog.sync({ force: true });
    } finally {
      setBusy(false);
    }
  };

  const content = cart ? (
    <>
      {lines.map((l) => (
        <Card key={l.productId} style={styles.gap}>
          <View style={styles.row}>
            <Text variant="h3" style={styles.flex}>
              {l.product?.name ?? '—'}
            </Text>
            <Text variant="money">{formatTRY(l.total)}</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.kg}>
              <Field
                label={t('catalog.quantity')}
                value={kgEdit[l.productId] ?? gramsToKgInput(l.grams)}
                keyboardType="decimal-pad"
                suffix="kg"
                onChangeText={(v) => {
                  setKgEdit((s) => ({ ...s, [l.productId]: v }));
                  const g = parseKgToGrams(v);
                  if (g) setQuantity(roasterId, l.productId, g);
                }}
              />
            </View>
            <Text variant="small" style={styles.flex}>
              {l.tier
                ? `${t('orders.tier', { kg: l.tier.minKg })}\n${formatTRY(l.tier.pricePerKgKurus)}/kg`
                : t('orders.minKg', { kg: l.minKg ?? 1 })}
            </Text>
            <Button
              title={t('orders.remove')}
              variant="ghost"
              small
              icon="trash"
              onPress={() => remove(roasterId, l.productId)}
            />
          </View>
          {!l.tier ? <Notice text={t('orders.minKg', { kg: l.minKg ?? 1 })} tone="danger" /> : null}
        </Card>
      ))}
      <Text variant="caption">{t('orders.deliveryDate').toUpperCase()}</Text>
      <Chips
        options={[{ value: '', label: t('orders.noDate') }, ...days]}
        value={cart.date ?? ''}
        onChange={(v) => setMeta(roasterId, { date: v || null })}
      />
      <Field
        label={t('orders.note')}
        value={cart.note}
        onChangeText={(v) => setMeta(roasterId, { note: v })}
        maxLength={500}
        multiline
      />
      <View style={styles.row}>
        <Text variant="h3" style={styles.flex}>
          {t('orders.subtotal')}
        </Text>
        <Text variant="h2">{formatTRY(subtotal)}</Text>
      </View>
      <Text variant="small">
        {roaster?.pricesIncludeVat ? t('catalog.vatIncluded') : t('catalog.vatExcluded')}
      </Text>
    </>
  ) : (
    <Notice text={t('orders.emptyCart')} tone="info" icon="box" />
  );

  return (
    <Screen
      title={roaster?.name ?? t('orders.carts')}
      back
      footer={
        cart ? (
          <>
            {!verified ? <Notice text={t('orders.emailFirst')} tone="info" /> : null}
            {offline ? <Notice text={t('orders.offlineOrder')} /> : null}
            <Button
              title={t('orders.send')}
              icon="send"
              onPress={send}
              loading={busy}
              disabled={invalid || !lines.length || offline || !verified}
            />
          </>
        ) : undefined
      }
    >
      {error ? <Notice text={error} tone="danger" /> : null}
      {flow.pending && !flow.ask && !flow.success ? (
        <Card style={styles.gap}>
          <Text variant="small">{t('orders.waMissing')}</Text>
          <Button
            title={t('orders.copy')}
            variant="secondary"
            icon="copy"
            small
            onPress={() => void flow.copy()}
          />
          <Button title={t('orders.didSend')} small onPress={() => flow.setAsk(true)} />
        </Card>
      ) : null}
      {content}

      <BottomSheet visible={flow.ask} onClose={flow.notYet} title={t('orders.didSend')}>
        <Text variant="body">{t('orders.didSendBody')}</Text>
        <Button title={t('orders.sentYes')} icon="check" onPress={() => void flow.confirmSent()} />
        <Button
          title={t('orders.copy')}
          variant="secondary"
          icon="copy"
          onPress={() => void flow.copy()}
        />
        <Button title={t('orders.sentNo')} variant="ghost" onPress={flow.notYet} />
      </BottomSheet>
      <SuccessOverlay
        visible={flow.success}
        title={t('orders.sentTitle')}
        body={t('orders.sentBody')}
        onClose={() => {
          flow.setSuccess(false);
          if (flow.pending)
            router.replace({ pathname: '/order/[id]', params: { id: flow.pending.order.id } });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  kg: { width: 132 },
});
