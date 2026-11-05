import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Card } from '@/components/Card';
import { Chips, EmptyState, Pill } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { tiersOf, useCatalog } from '@/features/catalog/store';
import {
  compareProducts,
  toCostSettings,
  toRecipeInput,
  type ComparisonRow,
} from '@/features/cost/compute';
import { useCostPrefs } from '@/features/cost/prefs';
import { useIngredients, useRecipes, useSettings } from '@/hooks/useCafeData';
import { t } from '@/locales';
import { colors, space } from '@/theme';
import { formatTRY } from '@/lib/format';
import { nav } from '@/lib/nav';

/** Every active product ranked by cost per cup for the selected recipe (spec §7.3 Karşılaştırma). */
export default function Compare() {
  const catalog = useCatalog();
  const prefs = useCostPrefs();
  const recipes = (useRecipes().data ?? []).filter((r) => r.isActive);
  const ingredients = useIngredients().data ?? [];
  const settings = useSettings().data;
  const [cat, setCat] = useState<'all' | 'espresso' | 'filter'>('espresso');
  const recipe = recipes.find((r) => r.id === prefs.recipeId) ?? recipes[0];

  const rows = useMemo<ComparisonRow[]>(() => {
    if (!recipe || !settings) return [];
    const products = Object.values(catalog.products).filter(
      (p) => cat === 'all' || p.category === cat,
    );
    return compareProducts(
      toRecipeInput(recipe, ingredients),
      toCostSettings(settings),
      products,
      catalog.roasters,
      (id) => tiersOf(catalog, id),
      prefs.monthlyKg,
    );
  }, [recipe, settings, ingredients, catalog, cat, prefs.monthlyKg]);

  return (
    <Screen title={t('catalog.compareTitle')} back scroll={false}>
      <Chips
        options={recipes.map((r) => ({ value: r.id, label: r.name }))}
        value={recipe?.id ?? null}
        onChange={(id) => prefs.set({ recipeId: id })}
      />
      <Chips
        options={[
          { value: 'espresso' as const, label: t('catalog.espresso') },
          { value: 'filter' as const, label: t('catalog.filter') },
          { value: 'all' as const, label: t('catalog.all') },
        ]}
        value={cat}
        onChange={setCat}
      />
      <View style={styles.kgRow}>
        <Text variant="caption">{t('cost.monthlyKg').toLocaleUpperCase('tr')}</Text>
        <View style={styles.flex}>
          <Chips
            options={['3', '5', '10', '20', '50'].map((v) => ({ value: v, label: `${v} kg` }))}
            value={String(prefs.monthlyKg)}
            onChange={(v) => prefs.set({ monthlyKg: Number(v) })}
          />
        </View>
      </View>
      <View style={styles.list}>
        <FlashList
          data={rows}
          keyExtractor={(r) => r.product.id}
          ListEmptyComponent={<EmptyState title={t('empty.generic')} />}
          ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
          renderItem={({ item, index }) => (
            <Card
              onPress={() =>
                nav.push({ pathname: '/product/[id]', params: { id: item.product.id } })
              }
              style={styles.row}
            >
              <Text
                variant="h2"
                color={index === 0 ? colors.success : colors.textMuted}
                style={styles.rank}
              >
                {index + 1}
              </Text>
              <View style={styles.flex}>
                <Text variant="bodyStrong">{item.product.name}</Text>
                <Text variant="small">
                  {item.roaster.name} · {formatTRY(item.tier.pricePerKgKurus)}/kg (
                  {t('catalog.fromKg', { kg: item.tier.minKg })})
                </Text>
                <Text variant="small">
                  {t('catalog.monthlySpend', {
                    price: formatTRY(Math.round(item.tier.pricePerKgKurus * prefs.monthlyKg)),
                  })}
                </Text>
                {item.belowMinimum ? (
                  <Pill tone="warning" label={t('orders.minKg', { kg: item.tier.minKg })} />
                ) : null}
                {item.roaster.minOrderKg && item.roaster.minOrderKg > prefs.monthlyKg ? (
                  <Pill
                    tone="warning"
                    label={t('catalog.minOrderPill', {
                      kg: String(item.roaster.minOrderKg).replace('.', ','),
                    })}
                  />
                ) : null}
              </View>
              <View style={styles.right}>
                <Text variant="money">{formatTRY(item.breakdown.totalKurus)}</Text>
                <Text variant="caption">/fincan</Text>
                {index > 0 && rows[0] ? (
                  <Text variant="caption" color={colors.warning}>
                    +{formatTRY(item.breakdown.totalKurus - rows[0].breakdown.totalKurus)}
                  </Text>
                ) : (
                  <Text variant="caption" color={colors.success}>
                    {t('catalog.cheapest')}
                  </Text>
                )}
              </View>
            </Card>
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rank: { width: 28, textAlign: 'center' },
  kgRow: { gap: 6 },
  right: { alignItems: 'flex-end' },
});
