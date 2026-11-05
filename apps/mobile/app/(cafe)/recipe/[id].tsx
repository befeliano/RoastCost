import { calculateCupCost, kurusToInput, parseTRYInput } from '@roastcost/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiError } from '@/api/client';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { Chips, Notice, ToggleRow } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import {
  useDeleteRecipe,
  useIngredients,
  useRecipes,
  useSaveRecipe,
  useSettings,
} from '@/hooks/useCafeData';
import { formatTRY, formatTRYFull, parseDecimal } from '@/lib/format';
import { t } from '@/locales';
import { colors, space, useColors } from '@/theme';
import { toast } from '@/components/Toast';
import { confirm } from '@/lib/confirm';
import { useCupCost } from '@/features/cost/useCupCost';
import { LoadState } from '@/components/LoadState';

interface Line {
  ingredientId: string;
  ml: string;
}

export default function RecipeEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const c = useColors();
  const recipesQ = useRecipes();
  const recipe = recipesQ.data?.find((r) => r.id === id);
  const ingredients = useIngredients().data ?? [];
  const dose = useSettings().data?.espressoDoseG ?? 18;
  const save = useSaveRecipe();
  const del = useDeleteRecipe();

  const [name, setName] = useState('');
  const [grams, setGrams] = useState('');
  const [usesCup, setUsesCup] = useState(true);
  const [price, setPrice] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!recipe) return;
    setName(recipe.name);
    setGrams(recipe.coffeeGrams ? String(recipe.coffeeGrams).replace('.', ',') : '');
    setUsesCup(recipe.usesCup);
    setPrice(recipe.sellPriceKurus ? kurusToInput(recipe.sellPriceKurus) : '');
    setLines(
      recipe.ingredients.map((i) => ({
        ingredientId: i.ingredientId,
        ml: String(i.quantityMl).replace('.', ','),
      })),
    );
  }, [recipe]);

  const unused = ingredients.filter((i) => !lines.some((l) => l.ingredientId === i.id));
  const cup = useCupCost();
  const preview =
    cup.settings && cup.source
      ? calculateCupCost(
          {
            coffeeGrams: grams.trim() ? parseDecimal(grams) : null,
            usesCup,
            sellPriceKurus: price.trim() ? parseTRYInput(price) : null,
            ingredients: lines.map((l) => ({
              quantityMl: parseDecimal(l.ml) ?? 0,
              pricePerLiterKurus:
                ingredients.find((i) => i.id === l.ingredientId)?.pricePerLiterKurus ?? 0,
            })),
          },
          cup.source,
          cup.settings,
        )
      : null;
  const duplicate = async () => {
    if (!recipe) return;
    try {
      await save.mutateAsync({
        body: {
          name: `${recipe.name} ${t('recipes.copySuffix')}`.slice(0, 80),
          coffeeGrams: recipe.coffeeGrams,
          usesCup: recipe.usesCup,
          sellPriceKurus: recipe.sellPriceKurus,
          ingredients: recipe.ingredients.map((i) => ({
            ingredientId: i.ingredientId,
            quantityMl: i.quantityMl,
          })),
        },
      });
      toast(t('recipes.duplicated'), 'copy');
      router.back();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : t('common.unknownError'));
    }
  };

  const onSave = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('common.required');
    const g = grams.trim() ? parseDecimal(grams) : null;
    if (grams.trim() && (g === null || g <= 0 || g > 60)) e.grams = '0–60 g arası';
    const p = price.trim() ? parseTRYInput(price) : null;
    if (price.trim() && !p) e.price = t('common.invalidMoney');
    const items = lines.map((l) => ({
      ingredientId: l.ingredientId,
      quantityMl: parseDecimal(l.ml) ?? -1,
    }));
    if (items.some((i) => i.quantityMl <= 0 || i.quantityMl > 1000)) e.lines = '1–1000 ml arası';
    setErrors(e);
    if (Object.keys(e).length) return;
    setServerError(null);
    try {
      await save.mutateAsync({
        id: isNew ? undefined : id,
        body: { name: name.trim(), coffeeGrams: g, usesCup, sellPriceKurus: p, ingredients: items },
      });
      toast(isNew ? 'Reçete eklendi' : 'Kaydedildi');
      router.back();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : t('common.unknownError'));
    }
  };

  const onDelete = async () => {
    if (!(await confirm(t('recipes.deleteConfirm'), recipe?.name, t('common.delete')))) return;
    await del.mutateAsync(id);
    toast('Reçete silindi', 'trash');
    router.back();
  };

  if (!isNew && !recipe)
    return (
      <Screen title={t('recipes.title')} back>
        <LoadState q={recipesQ} notFound={recipesQ.isSuccess && t('common.notFound')} />
      </Screen>
    );
  return (
    <Screen
      title={isNew ? t('recipes.new') : name || t('recipes.title')}
      back
      footer={<Button title={t('common.save')} onPress={onSave} loading={save.isPending} />}
    >
      {serverError ? <Notice text={serverError} tone="danger" /> : null}
      <Field label={t('recipes.name')} value={name} onChangeText={setName} error={errors.name} />
      <Field
        label={t('recipes.coffeeGrams')}
        value={grams}
        onChangeText={setGrams}
        keyboardType="decimal-pad"
        suffix="g"
        hint={t('recipes.coffeeGramsHint', { dose })}
        error={errors.grams}
      />
      <ToggleRow label={t('recipes.usesCup')} value={usesCup} onChange={setUsesCup} />
      <Field
        label={t('recipes.sellPrice')}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        suffix="₺"
        error={errors.price}
      />

      <Text variant="h3">{t('recipes.ingredients')}</Text>
      {!lines.length ? <Text variant="small">{t('recipes.noIngredients')}</Text> : null}
      {lines.map((l, idx) => {
        const ing = ingredients.find((i) => i.id === l.ingredientId);
        return (
          <Card key={l.ingredientId} style={styles.line}>
            <Text variant="bodyStrong" style={styles.flex}>
              {ing?.name ?? '?'}
            </Text>
            <View style={styles.ml}>
              <Field
                label={`${ing?.name ?? ''} ${t('recipes.ml')}`}
                hideLabel
                suffix="ml"
                value={l.ml}
                keyboardType="decimal-pad"
                onChangeText={(v) =>
                  setLines((ls) => ls.map((x, i) => (i === idx ? { ...x, ml: v } : x)))
                }
              />
            </View>
            <Button
              title={t('orders.remove')}
              icon="trash"
              variant="ghost"
              small
              onPress={() => setLines((ls) => ls.filter((_, i) => i !== idx))}
            />
          </Card>
        );
      })}
      {errors.lines ? (
        <Text variant="small" color={colors.danger}>
          {errors.lines}
        </Text>
      ) : null}
      {unused.length ? (
        <View style={styles.add}>
          <View style={styles.addHead}>
            <Icon name="plus" size={18} color={c.primaryText} />
            <Text variant="caption">{t('recipes.addIngredient').toUpperCase()}</Text>
          </View>
          <Chips
            options={unused.map((i) => ({ value: i.id, label: i.name }))}
            value={null}
            onChange={(v) => setLines((ls) => [...ls, { ingredientId: v, ml: '' }])}
          />
        </View>
      ) : null}
      <Card style={styles.preview}>
        <Text variant="caption">{t('recipes.preview').toLocaleUpperCase('tr')}</Text>
        {preview ? (
          <>
            <View style={styles.previewRow}>
              <Text variant="body">{t('cost.total')}</Text>
              <Text variant="h3">{formatTRYFull(preview.totalKurus)}</Text>
            </View>
            {preview.currentMarginPct !== null ? (
              <View style={styles.previewRow}>
                <Text variant="body">{t('cost.currentMargin')}</Text>
                <Text
                  variant="h3"
                  color={
                    preview.marginStatus === 'loss'
                      ? colors.danger
                      : preview.marginStatus === 'below_target'
                        ? colors.warning
                        : colors.success
                  }
                >
                  %{Math.round(preview.currentMarginPct)}
                </Text>
              </View>
            ) : null}
            <Button
              title={t('recipes.useSuggested', {
                price: formatTRY(preview.suggestedPriceRoundedKurus),
              })}
              variant="secondary"
              small
              icon="spark"
              onPress={() => setPrice(kurusToInput(preview.suggestedPriceRoundedKurus))}
            />
          </>
        ) : (
          <Text variant="small">{t('recipes.previewNoSource')}</Text>
        )}
      </Card>
      {!isNew ? (
        <Button
          title={t('recipes.duplicate')}
          variant="ghost"
          icon="copy"
          onPress={() => duplicate()}
        />
      ) : null}
      {!isNew ? (
        <Button
          title={t('common.delete')}
          variant="danger"
          icon="trash"
          onPress={() => onDelete()}
          loading={del.isPending}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  ml: { width: 110 },
  add: { gap: space.sm },
  addHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  preview: { gap: space.sm },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
