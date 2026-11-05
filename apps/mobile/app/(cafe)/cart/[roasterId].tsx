import { lineTotalKurus, nextTierHint, orderTerms, selectTier } from '@roastcost/shared';
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
import { formatGramsKg, formatTRY, gramsToKgInput, parseKgToGrams } from '@/lib/format';
import { t } from '@/locales';
import { useCart } from '@/store/cart';
import { useSession } from '@/store/session';
import { colors, space, useColors } from '@/theme';
import { Icon } from '@/components/Icon';
import { Tap } from '@/components/Tap';

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
  const c = useColors();

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
      hint: nextTierHint(tiers, grams, 3),
    };
  });
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const terms = orderTerms(
    lines.map((l) => l.grams),
    subtotal,
    roaster?.minOrderKg,
    roaster?.cardSurchargeBp,
  );
  const invalid = lines.some((l) => !l.tier || !l.product) || !terms.meetsMinimum;
  const setKg = (productId: string, grams: number) => {
    if (grams <= 0) return;
    setKgEdit((s) => ({ ...s, [productId]: gramsToKgInput(grams) }));
    setQuantity(roasterId, productId, grams);
  };

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
            <Tap
              accessibilityRole="button"
              accessibilityLabel={`${l.product?.name ?? ''} 1 kg azalt`}
              onPress={() => setKg(l.productId, l.grams - 1000)}
              style={styles.step}
              hitSlop={8}
            >
              <Icon name="minus" size={18} color={c.primaryText} />
            </Tap>
            <View style={styles.kg}>
              <Field
                label={t('catalog.quantity')}
                hideLabel
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
            <Tap
              accessibilityRole="button"
              accessibilityLabel={`${l.product?.name ?? ''} 1 kg artır`}
              onPress={() => setKg(l.productId, l.grams + 1000)}
              style={styles.step}
              hitSlop={8}
            >
              <Icon name="plus" size={18} color={c.primaryText} />
            </Tap>
            <Text variant="small" style={styles.flex}>
              {l.tier
                ? `${t('orders.tier', { kg: l.tier.minKg })}\n${formatTRY(l.tier.pricePerKgKurus)}/kg`
                : t('orders.minKg', { kg: l.minKg ?? 1 })}
            </Text>
            <Tap
              accessibilityRole="button"
              accessibilityLabel={`${l.product?.name ?? ''} — ${t('orders.remove')}`}
              onPress={() => remove(roasterId, l.productId)}
              hitSlop={13}
            >
              <Icon name="trash" size={20} color={colors.textMuted} />
            </Tap>
          </View>
          {l.hint && l.tier ? (
            <Tap
              accessibilityRole="button"
              onPress={() => setKg(l.productId, l.hint!.tier.minKg * 1000)}
              style={[styles.hint, { backgroundColor: c.primaryBg }]}
            >
              <Icon name="spark" size={16} color={c.primaryText} />
              <Text variant="small" color={c.primaryText} style={styles.flex}>
                {t('orders.tierHint', {
                  kg: String(l.hint.extraKg).replace('.', ','),
                  price: formatTRY(l.hint.tier.pricePerKgKurus),
                })}
              </Text>
            </Tap>
          ) : null}
          {!l.tier ? <Notice text={t('orders.minKg', { kg: l.minKg ?? 1 })} tone="danger" /> : null}
        </Card>
      ))}
      {terms.minOrderKg ? (
        <Card style={styles.gap}>
          <View style={styles.row}>
            <Text variant="bodyStrong" style={styles.flex}>
              {t('orders.totalKg', { kg: formatGramsKg(terms.totalG) })}
            </Text>
            <Text variant="small">
              {t('orders.minOrder', { kg: String(terms.minOrderKg).replace('.', ',') })}
            </Text>
          </View>
          <View style={styles.bar} accessibilityRole="progressbar">
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.round(terms.progress * 100)}%`,
                  backgroundColor: terms.meetsMinimum ? colors.success : c.primary,
                },
              ]}
            />
          </View>
          <Text variant="small" color={terms.meetsMinimum ? colors.success : colors.text}>
            {terms.meetsMinimum
              ? t('orders.minOk')
              : t('orders.minMissing', { kg: String(terms.missingKg).replace('.', ',') })}
          </Text>
        </Card>
      ) : null}
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
        <Text variant="h2" style={styles.num}>
          {formatTRY(subtotal)}
        </Text>
      </View>
      {terms.cardSurchargeKurus ? (
        <Text variant="small">
          {t('orders.cardSurcharge', {
            pct: String((roaster?.cardSurchargeBp ?? 0) / 100).replace('.', ','),
            amount: formatTRY(terms.cardSurchargeKurus),
          })}
        </Text>
      ) : null}
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
            {!terms.meetsMinimum ? (
              <Text variant="small" style={styles.center}>
                {t('orders.minMissing', { kg: String(terms.missingKg).replace('.', ',') })}
              </Text>
            ) : null}
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
            onPress={() => flow.copy()}
          />
          <Button title={t('orders.didSend')} small onPress={() => flow.setAsk(true)} />
        </Card>
      ) : null}
      {content}

      <BottomSheet visible={flow.ask} onClose={flow.notYet} title={t('orders.didSend')}>
        <Text variant="body">{t('orders.didSendBody')}</Text>
        <Button title={t('orders.sentYes')} icon="check" onPress={() => flow.confirmSent()} />
        <Button
          title={t('orders.copy')}
          variant="secondary"
          icon="copy"
          onPress={() => flow.copy()}
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
  kg: { flex: 1, maxWidth: 120 },
  step: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: 10,
  },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  num: { fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center' },
});
