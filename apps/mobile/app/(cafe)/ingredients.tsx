import { formatTRY, kurusToInput, parseTRYInput, type IngredientKind } from '@roastcost/shared';
import { useState } from 'react';
import { Alert } from 'react-native';
import { ApiError } from '@/api/client';
import type { Ingredient } from '@/api/types';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Chips, Notice, Row } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { useDeleteIngredient, useIngredients, useSaveIngredient } from '@/hooks/useCafeData';
import { t } from '@/locales';

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
  const [error, setError] = useState<string | null>(null);

  const open = (i?: Ingredient) => {
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
      setEdit(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.unknownError'));
    }
  };
  const remove = () =>
    edit?.id &&
    Alert.alert(t('common.delete'), edit.name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await del.mutateAsync(edit.id as string);
            setEdit(null);
          } catch (e) {
            setError(e instanceof ApiError ? e.message : t('common.unknownError'));
          }
        },
      },
    ]);

  return (
    <Screen title={t('settings.ingredients')} back>
      {(list.data ?? []).map((i) => (
        <Row
          key={i.id}
          title={i.name}
          subtitle={`${KINDS.find((k) => k.value === i.kind)?.label} · ${formatTRY(i.pricePerLiterKurus)}/L`}
          onPress={() => open(i)}
        />
      ))}
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
        <Button title={t('common.save')} onPress={() => void submit()} loading={save.isPending} />
        {edit?.id ? <Button title={t('common.delete')} variant="danger" onPress={remove} /> : null}
      </BottomSheet>
    </Screen>
  );
}
