import { kurusToInput, parseTRYInput, type IngredientKind } from '@roastcost/shared';
import { useState } from 'react';
import { ApiError } from '@/api/client';
import type { Ingredient } from '@/api/types';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Chips, Notice, Row, RowGroup, EmptyState } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { useDeleteIngredient, useIngredients, useSaveIngredient } from '@/hooks/useCafeData';
import { t } from '@/locales';
import { formatTRY } from '@/lib/format';
import { toast } from '@/components/Toast';
import { confirm } from '@/lib/confirm';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { space } from '@/theme';
import { Skeleton } from '@/components/Skeleton';

const KINDS: { value: IngredientKind; label: string }[] = [
  { value: 'milk', label: t('settings.kindMilk') },
  { value: 'syrup', label: t('settings.kindSyrup') },
  { value: 'other', label: t('settings.kindOther') },
];

export default function Ingredients() {
  const list = useIngredients();
  const save = useSaveIngredient();
  const del = useDeleteIngredient();
  const [edit, setEdit] = useState<Partial<Ingredient> | null>(null);
  const [price, setPrice] = useState('');
  const [pkg, setPkg] = useState({ price: '', ml: '' });
  const [error, setError] = useState<string | null>(null);

  const pkgKurus = parseTRYInput(pkg.price || '');
  const pkgMl = Number(pkg.ml.replace(/\D/g, ''));
  const pkgPerL = pkgKurus && pkgMl > 0 ? Math.round((pkgKurus * 1000) / pkgMl) : null;
  const open = (i?: Ingredient) => {
    setPkg({ price: '', ml: '' });
    setError(null);
    setEdit(i ?? { name: '', kind: 'syrup' });
    setPrice(i ? kurusToInput(i.pricePerLiterKurus) : '');
  };
  const submit = async () => {
    const p = parseTRYInput(price || '0');
    if (!edit?.name?.trim() || p === null) return setError(t('common.required'));
    try {
      await save.mutateAsync({
        id: edit.id,
        name: edit.name.trim(),
        kind: edit.kind,
        pricePerLiterKurus: p,
      });
      toast('Kaydedildi');
      setEdit(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.unknownError'));
    }
  };
  const remove = async () => {
    if (!edit?.id || !(await confirm(t('common.delete'), edit.name, t('common.delete')))) return;
    try {
      await del.mutateAsync(edit.id);
      toast('Silindi', 'trash');
      setEdit(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.unknownError'));
    }
  };

  return (
    <Screen title={t('settings.ingredients')} back>
      {list.isSuccess && !list.data.length ? (
        <EmptyState
          compact
          title={t('settings.noIngredients')}
          body={t('settings.noIngredientsBody')}
        />
      ) : null}
      {list.isLoading ? <Skeleton rows={2} /> : null}
      {list.data?.length ? (
        <RowGroup>
          {(list.data ?? []).map((i) => (
            <Row
              key={i.id}
              title={i.name}
              subtitle={`${KINDS.find((k) => k.value === i.kind)?.label} · ${formatTRY(i.pricePerLiterKurus)}/L`}
              onPress={() => open(i)}
            />
          ))}
        </RowGroup>
      ) : null}
      <Button title={t('common.add')} icon="plus" variant="secondary" onPress={() => open()} />
      <BottomSheet
        visible={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? edit.name : t('common.add')}
      >
        {error ? <Notice text={error} tone="danger" /> : null}
        <Field
          label={t('settings.ingredientName')}
          value={edit?.name ?? ''}
          onChangeText={(v) => setEdit((e) => ({ ...e, name: v }))}
        />
        <Chips
          options={KINDS}
          value={edit?.kind ?? null}
          onChange={(k) => setEdit((e) => ({ ...e, kind: k }))}
        />
        <Field
          label={t('settings.pricePerLiter')}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          suffix="₺/L"
        />
        <Text variant="caption">{t('settings.pkgCalc').toLocaleUpperCase('tr')}</Text>
        <View style={styles.calcRow}>
          <View style={styles.flex}>
            <Field
              label={t('settings.pkgPrice')}
              value={pkg.price}
              onChangeText={(v) => setPkg((x) => ({ ...x, price: v }))}
              keyboardType="decimal-pad"
              suffix="₺"
            />
          </View>
          <View style={styles.flex}>
            <Field
              label={t('settings.pkgMl')}
              value={pkg.ml}
              onChangeText={(v) => setPkg((x) => ({ ...x, ml: v }))}
              keyboardType="number-pad"
              suffix="ml"
              placeholder="1000"
            />
          </View>
        </View>
        {pkgPerL !== null ? (
          <Button
            title={t('settings.usePkg', { price: formatTRY(pkgPerL) })}
            variant="secondary"
            small
            onPress={() => setPrice(kurusToInput(pkgPerL))}
          />
        ) : null}
        <Button title={t('common.save')} onPress={() => submit()} loading={save.isPending} />
        {edit?.id ? (
          <Button title={t('common.delete')} variant="danger" onPress={() => remove()} />
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  calcRow: { flexDirection: 'row', gap: space.sm },
});
