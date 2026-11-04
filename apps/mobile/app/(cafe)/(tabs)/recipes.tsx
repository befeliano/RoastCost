import { router } from 'expo-router';
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

export default function Recipes() {
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
              {r.sellPriceKurus ? (
                <Text variant="small">Menü: {formatTRY(r.sellPriceKurus)}</Text>
              ) : null}
              {r.templateKey ? <Pill label={t('recipes.default')} /> : null}
            </Card>
          </Animated.View>
        );
      })}
    </Screen>
  );
}
