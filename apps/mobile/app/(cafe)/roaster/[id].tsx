import { formatTRY, selectTier } from '@roastcost/shared';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Notice, Pill } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Freshness } from '@/features/catalog/Freshness';
import { productsOf, tiersOf, useCatalog } from '@/features/catalog/store';
import { gramsToKgInput, parseKgToGrams } from '@/lib/format';
import { t } from '@/locales';
import { useCart } from '@/store/cart';
import { colors, space } from '@/theme';

export default function RoasterDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const roaster = catalog.roasters[id];
  const cart = useCart((s) => s.carts[id]);
  const setQty = useCart((s) => s.setQuantity);
  const [sheet, setSheet] = useState<string | null>(null);
  const [kg, setKg] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  if (!roaster)
    return (
      <Screen title={t('catalog.title')} back>
        <Text>…</Text>
      </Screen>
    );
  const products = productsOf(catalog, id);
  const sheetProduct = sheet ? catalog.products[sheet] : undefined;
  const sheetTiers = sheet ? tiersOf(catalog, sheet) : [];
  const grams = parseKgToGrams(kg);
  const tier = grams ? selectTier(sheetTiers, grams / 1000) : null;
  const cartCount = cart ? Object.keys(cart.items).length : 0;

  return (
    <Screen
      title={roaster.name}
      back
      footer={
        cartCount ? (
          <Button
            title={`${t('orders.carts')} · ${t('orders.items', { n: cartCount })}`}
            icon="box"
            onPress={() =>
              router.push({ pathname: '/cart/[roasterId]', params: { roasterId: id } })
            }
          />
        ) : undefined
      }
    >
      <View style={styles.head}>
        <Freshness iso={roaster.pricesUpdatedAt} />
        <Pill
          label={roaster.pricesIncludeVat ? t('catalog.vatIncluded') : t('catalog.vatExcluded')}
        />
      </View>
      {toast ? <Notice text={toast} tone="success" icon="check" /> : null}
      {products.map((p) => {
        const tiers = tiersOf(catalog, p.id);
        const inCart = cart?.items[p.id];
        return (
          <Card key={p.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text variant="h3">{p.name}</Text>
                <Text variant="small">
                  {[
                    p.category === 'espresso' ? t('catalog.espresso') : t('catalog.filter'),
                    p.origin,
                    p.process,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {p.tastingNotes ? <Text variant="small">“{p.tastingNotes}”</Text> : null}
              </View>
            </View>
            <View style={styles.tiers}>
              {tiers.map((tt) => (
                <View key={tt.id} style={styles.tier}>
                  <Text variant="caption">{t('catalog.fromKg', { kg: tt.minKg })}</Text>
                  <Text variant="money">
                    {formatTRY(tt.pricePerKgKurus)}
                    <Text variant="small">{t('catalog.perKg')}</Text>
                  </Text>
                </View>
              ))}
            </View>
            <Button
              small
              variant={inCart ? 'secondary' : 'primary'}
              icon={inCart ? 'check' : 'plus'}
              title={inCart ? `${gramsToKgInput(inCart)} kg` : t('catalog.addToCart')}
              onPress={() => {
                setKg(inCart ? gramsToKgInput(inCart) : String(tiers[0]?.minKg ?? 1));
                setSheet(p.id);
              }}
            />
          </Card>
        );
      })}

      <BottomSheet visible={!!sheet} onClose={() => setSheet(null)} title={sheetProduct?.name}>
        <Field
          label={t('catalog.quantity')}
          value={kg}
          onChangeText={setKg}
          keyboardType="decimal-pad"
          suffix="kg"
          autoFocus
          error={kg && !grams ? t('common.invalidNumber') : undefined}
        />
        {grams && !tier && sheetTiers[0] ? (
          <Notice text={t('orders.minKg', { kg: sheetTiers[0].minKg })} />
        ) : null}
        {grams && tier ? (
          <Card style={styles.row}>
            <Text variant="body" style={styles.flex}>
              {t('orders.tier', { kg: tier.minKg })} · {formatTRY(tier.pricePerKgKurus)}/kg
            </Text>
            <Text variant="money" color={colors.primary}>
              {formatTRY(Math.round((grams * tier.pricePerKgKurus) / 1000))}
            </Text>
          </Card>
        ) : null}
        <Button
          title={t('catalog.addToCart')}
          disabled={!grams || !tier}
          onPress={() => {
            if (!sheet || !grams) return;
            setQty(id, sheet, grams);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setToast(t('catalog.added'));
            setTimeout(() => setToast(null), 1800);
            setSheet(null);
          }}
        />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  card: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  tiers: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tier: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.bg,
  },
});
