import { calculateCupCost, formatTRY, lineTotalKurus, selectTier } from '@roastcost/shared';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { Notice, Pill } from '@/components/Misc';
import { RoasterAvatar } from '@/components/RoasterAvatar';
import { Screen } from '@/components/Screen';
import { SuccessOverlay } from '@/components/SuccessOverlay';
import { Text } from '@/components/Text';
import { RoastDots } from '@/features/catalog/RoastDots';
import { tiersOf, useCatalog } from '@/features/catalog/store';
import { toCostSettings, toRecipeInput } from '@/features/cost/compute';
import { useIngredients, useRecipes, useSettings } from '@/hooks/useCafeData';
import { gramsToKgInput, parseKgToGrams } from '@/lib/format';
import { t } from '@/locales';
import { useCart } from '@/store/cart';
import { colors, radius, space, useColors } from '@/theme';

/** One bean: detailed tier pricing, cup cost with this bean, quantity → cart. */
export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const c = useColors();
  const p = catalog.products[id];
  const roaster = p ? catalog.roasters[p.roasterId] : undefined;
  const tiers = p ? tiersOf(catalog, p.id) : [];
  const inCart = useCart((s) => (p ? s.carts[p.roasterId]?.items[p.id] : undefined));
  const [kg, setKg] = useState(inCart ? gramsToKgInput(inCart) : String(tiers[0]?.minKg ?? 1));
  const [added, setAdded] = useState(false);
  const settings = useSettings().data;
  const recipes = useRecipes().data ?? [];
  const ingredients = useIngredients().data ?? [];
  if (!p || !roaster) {
    return (
      <Screen title={t('catalog.title')} back>
        <Text>{t('common.loading')}</Text>
      </Screen>
    );
  }
  const grams = parseKgToGrams(kg);
  const tier = grams ? selectTier(tiers, grams / 1000) : null;
  const base = tiers[0]?.pricePerKgKurus ?? 0;
  const espressoRecipe = recipes.find((r) => r.templateKey === 'espresso') ?? recipes[0];
  const cup =
    tier && settings && espressoRecipe
      ? calculateCupCost(
          toRecipeInput(espressoRecipe, ingredients),
          {
            pricePerKgKurus: tier.pricePerKgKurus,
            pricesIncludeVat: roaster.pricesIncludeVat,
            vatRatePct: roaster.vatRatePct,
          },
          toCostSettings(settings),
        )
      : null;
  const step = (d: number) => {
    const g = (grams ?? 0) + d * 1000;
    if (g > 0) setKg(gramsToKgInput(g));
  };

  return (
    <Screen
      title={p.name}
      subtitle={roaster.name}
      back
      footer={
        <Button
          title={inCart ? t('catalog.updateCart') : t('catalog.addToCart')}
          icon="plus"
          disabled={!grams || !tier}
          onPress={() => {
            if (!grams) return;
            useCart.getState().setQuantity(roaster.id, p.id, grams);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setAdded(true);
          }}
        />
      }
    >
      <Card style={styles.gap}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/roaster/[id]', params: { id: roaster.id } })}
          style={styles.row}
        >
          <RoasterAvatar
            name={roaster.name}
            logoUrl={roaster.logoUrl}
            color={roaster.brandColor}
            size={36}
          />
          <Text variant="bodyStrong" style={styles.flex}>
            {roaster.name}
          </Text>
          <Icon name="chevron" size={18} color={colors.textMuted} />
        </Pressable>
        <View style={styles.pills}>
          <Pill
            tone="primary"
            label={p.category === 'espresso' ? t('catalog.espresso') : t('catalog.filter')}
          />
          {p.origin ? <Pill label={p.origin} /> : null}
          {p.process ? <Pill label={t(`catalog.process.${p.process}`)} /> : null}
        </View>
        <RoastDots level={p.roastLevel} />
        {p.tastingNotes ? (
          <View style={styles.notes}>
            {p.tastingNotes.split(',').map((n) => (
              <View key={n} style={[styles.note, { backgroundColor: c.primaryBg }]}>
                <Text variant="caption" color={c.primaryText}>
                  {n.trim()}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      <Text variant="h3">{t('catalog.tierTable')}</Text>
      <Card style={styles.table}>
        <View style={[styles.tr, styles.th]}>
          <Text variant="caption" style={styles.c1}>
            {t('catalog.minQty')}
          </Text>
          <Text variant="caption" style={styles.c2}>
            {t('catalog.pricePerKg')}
          </Text>
          <Text variant="caption" style={styles.c3}>
            {t('catalog.saving')}
          </Text>
        </View>
        {tiers.map((tt) => {
          const on = tier?.id === tt.id;
          const save = base ? Math.round((1 - tt.pricePerKgKurus / base) * 100) : 0;
          return (
            <Pressable
              key={tt.id}
              accessibilityRole="button"
              onPress={() => setKg(String(tt.minKg))}
              style={[styles.tr, on && { backgroundColor: c.primaryBg }]}
            >
              <Text variant="bodyStrong" style={styles.c1}>
                {tt.minKg} kg+
              </Text>
              <Text variant="money" style={styles.c2} color={on ? c.primaryText : colors.text}>
                {formatTRY(tt.pricePerKgKurus)}
              </Text>
              <Text
                variant="small"
                style={styles.c3}
                color={save > 0 ? colors.success : colors.textMuted}
              >
                {save > 0 ? `−%${save}` : '—'}
              </Text>
            </Pressable>
          );
        })}
      </Card>

      <Text variant="h3">{t('catalog.quantity')}</Text>
      <View style={styles.row}>
        <Button title="−1" variant="secondary" small onPress={() => step(-1)} />
        <View style={styles.flex}>
          <Field
            label={t('catalog.quantity')}
            hideLabel
            value={kg}
            onChangeText={setKg}
            keyboardType="decimal-pad"
            suffix="kg"
            error={kg && !grams ? t('common.invalidNumber') : undefined}
          />
        </View>
        <Button title="+1" variant="secondary" small onPress={() => step(1)} />
      </View>
      {grams && !tier && tiers[0] ? (
        <Notice text={t('orders.minKg', { kg: tiers[0].minKg })} />
      ) : null}
      {grams && tier ? (
        <Card style={[styles.gap, { backgroundColor: c.primaryBg, borderColor: c.primaryBg }]}>
          <View style={styles.row}>
            <Text variant="body" style={styles.flex}>
              {t('orders.tier', { kg: tier.minKg })} · {formatTRY(tier.pricePerKgKurus)}/kg
            </Text>
            <Text variant="h2" color={c.primaryText}>
              {formatTRY(lineTotalKurus(grams, tier.pricePerKgKurus))}
            </Text>
          </View>
          {cup && espressoRecipe ? (
            <Text variant="small">
              {t('catalog.cupWith', {
                recipe: espressoRecipe.name,
                price: formatTRY(cup.totalKurus),
              })}
            </Text>
          ) : null}
        </Card>
      ) : null}
      <SuccessOverlay
        autoHideMs={700}
        visible={added}
        title={t('catalog.added')}
        body={`${p.name} · ${kg} kg`}
        onClose={() => {
          setAdded(false);
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  notes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  note: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  table: { padding: 0, overflow: 'hidden' },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  th: { minHeight: 38, backgroundColor: colors.surface },
  c1: { flex: 1 },
  c2: { flex: 1.4 },
  c3: { width: 60, textAlign: 'right' },
});
