import { calculateCupCost } from '@roastcost/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState, ErrorState, Pill } from '@/components/Misc';
import { Skeleton } from '@/components/Skeleton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useIngredients, useRecipes, useSettings } from '@/hooks/useCafeData';
import { t } from '@/locales';
import { formatTRY } from '@/lib/format';
import { toRecipeInput } from '@/features/cost/compute';
import { useCupCost } from '@/features/cost/useCupCost';
import { space } from '@/theme';

export default function Recipes() {
  const cup = useCupCost();
  const recipes = useRecipes();
  const ingredients = useIngredients();
  const settings = useSettings();
  const reduce = useReducedMotion();
  const list = recipes.data ?? [];
  return (
    <Screen
      title={t('recipes.title')}
      onRefresh={() => void recipes.refetch()}
      refreshing={recipes.isRefetching}
    >
      <Button
        title={t('recipes.new')}
        icon="plus"
        variant="secondary"
        onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: 'new' } })}
      />
      {recipes.isLoading ? <Skeleton rows={4} /> : null}
      {recipes.isError && !list.length ? (
        <ErrorState onRetry={() => void recipes.refetch()} />
      ) : null}
      {!list.length && !recipes.isLoading && !recipes.isError ? (
        <EmptyState title={t('recipes.empty')} />
      ) : null}
      {list.map((r, i) => {
        const parts = r.ingredients.map(
          (ri) =>
            `${ingredients.data?.find((x) => x.id === ri.ingredientId)?.name ?? '?'} ${ri.quantityMl} ml`,
        );
        return (
          // Stagger only the first 8 items (spec §11.4)
          <Animated.View
            key={r.id}
            entering={reduce || i >= 8 ? undefined : FadeInDown.delay(i * 40).duration(220)}
          >
            <Card
              onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })}
              accessibilityLabel={r.name}
            >
              <Text variant="h3">{r.name}</Text>
              <Text variant="small">
                {r.coffeeGrams ?? settings.data?.espressoDoseG ?? 18} g kahve
                {parts.length ? ' · ' + parts.join(' · ') : ''}
                {r.usesCup ? ' · bardak' : ''}
              </Text>
              {(() => {
                const res =
                  cup.settings && cup.source
                    ? calculateCupCost(
                        toRecipeInput(r, ingredients.data ?? []),
                        cup.source,
                        cup.settings,
                      )
                    : null;
                if (!res) return null;
                const tone =
                  res.marginStatus === 'loss'
                    ? 'danger'
                    : res.marginStatus === 'below_target'
                      ? 'warning'
                      : 'success';
                return (
                  <View style={styles.costRow}>
                    <Text variant="bodyStrong">
                      {t('recipes.costLine', { cost: formatTRY(res.totalKurus) })}
                    </Text>
                    {r.sellPriceKurus && res.currentMarginPct !== null ? (
                      <Pill
                        tone={tone}
                        label={t('recipes.marginLine', {
                          price: formatTRY(r.sellPriceKurus),
                          pct: Math.round(res.currentMarginPct),
                        })}
                      />
                    ) : (
                      <Text variant="small">
                        {t('recipes.suggestedLine', {
                          price: formatTRY(res.suggestedPriceRoundedKurus),
                        })}
                      </Text>
                    )}
                  </View>
                );
              })()}
            </Card>
          </Animated.View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    marginTop: space.xs,
    flexWrap: 'wrap',
  },
});
