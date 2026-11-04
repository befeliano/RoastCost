import { kurusToInput, parseTRYInput } from '@roastcost/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ApiError } from '@/api/client';
import type { Settings } from '@/api/types';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Notice, ToggleRow } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { useSettings, useUpdateSettings } from '@/hooks/useCafeData';
import { parseDecimal } from '@/lib/format';
import { t } from '@/locales';

type Form = Record<'dose' | 'cw' | 'iw' | 'cup' | 'over' | 'margin' | 'vat' | 'step', string>;

export default function Costs() {
  const s = useSettings().data;
  const update = useUpdateSettings();
  const [f, setF] = useState<Form | null>(null);
  const [exVat, setExVat] = useState(true);
  const [errors, setErrors] = useState<Partial<Form>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  useEffect(() => {
    if (s && !f) {
      const n = (v: number) => String(v).replace('.', ',');
      setF({
        dose: n(s.espressoDoseG),
        cw: n(s.coffeeWastePct),
        iw: n(s.ingredientWastePct),
        cup: kurusToInput(s.cupCostKurus),
        over: kurusToInput(s.fixedOverheadPerCupKurus),
        margin: n(s.targetMarginPct),
        vat: n(s.saleVatRatePct),
        step: kurusToInput(s.priceRoundingStepKurus),
      });
      setExVat(s.costExcludesVat);
    }
  }, [s, f]);
  if (!f)
    return (
      <Screen title={t('settings.costParams')} back>
        {null}
      </Screen>
    );
  const set = (k: keyof Form) => (v: string) => setF({ ...f, [k]: v });

  const save = async () => {
    const e: Partial<Form> = {};
    const num = (k: keyof Form, min: number, max: number) => {
      const v = parseDecimal(f[k]);
      if (v === null || v < min || v > max) e[k] = `${min}–${max}`;
      return v ?? 0;
    };
    const money = (k: keyof Form, min = 0) => {
      const v = parseTRYInput(f[k] || '0');
      if (v === null || v < min) e[k] = t('common.invalidMoney');
      return v ?? 0;
    };
    const patch: Partial<Settings> = {
      espressoDoseG: num('dose', 5, 40),
      coffeeWastePct: num('cw', 0, 50),
      ingredientWastePct: num('iw', 0, 50),
      cupCostKurus: money('cup'),
      fixedOverheadPerCupKurus: money('over'),
      targetMarginPct: num('margin', 1, 95),
      saleVatRatePct: num('vat', 0, 30),
      priceRoundingStepKurus: money('step', 1),
      costExcludesVat: exVat,
    };
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      await update.mutateAsync(patch);
      router.back();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : t('common.unknownError'));
    }
  };

  return (
    <Screen
      title={t('settings.costParams')}
      back
      footer={<Button title={t('common.save')} onPress={save} loading={update.isPending} />}
    >
      {serverError ? <Notice text={serverError} tone="danger" /> : null}
      <Field
        label={t('settings.dose')}
        value={f.dose}
        onChangeText={set('dose')}
        keyboardType="decimal-pad"
        suffix="g"
        error={errors.dose}
      />
      <Field
        label={t('settings.coffeeWaste')}
        value={f.cw}
        onChangeText={set('cw')}
        keyboardType="decimal-pad"
        suffix="%"
        error={errors.cw}
      />
      <Field
        label={t('settings.ingredientWaste')}
        value={f.iw}
        onChangeText={set('iw')}
        keyboardType="decimal-pad"
        suffix="%"
        error={errors.iw}
      />
      <Field
        label={t('settings.cupCost')}
        value={f.cup}
        onChangeText={set('cup')}
        keyboardType="decimal-pad"
        suffix="₺"
        error={errors.cup}
      />
      <Field
        label={t('settings.overhead')}
        value={f.over}
        onChangeText={set('over')}
        keyboardType="decimal-pad"
        suffix="₺"
        hint={t('settings.overheadHint')}
        error={errors.over}
      />
      <Field
        label={t('settings.targetMargin')}
        value={f.margin}
        onChangeText={set('margin')}
        keyboardType="decimal-pad"
        suffix="%"
        error={errors.margin}
      />
      <Field
        label={t('settings.saleVat')}
        value={f.vat}
        onChangeText={set('vat')}
        keyboardType="decimal-pad"
        suffix="%"
        hint={t('settings.saleVatHint')}
        error={errors.vat}
      />
      <Field
        label={t('settings.rounding')}
        value={f.step}
        onChangeText={set('step')}
        keyboardType="decimal-pad"
        suffix="₺"
        error={errors.step}
      />
      <ToggleRow label={t('settings.costExVat')} value={exVat} onChange={setExVat} />
    </Screen>
  );
}
