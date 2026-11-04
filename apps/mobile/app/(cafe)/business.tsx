import { formatTrPhone, normalizeTrPhone } from '@roastcost/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { api, ApiError } from '@/api/client';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { t } from '@/locales';
import { useSession } from '@/store/session';
import { toast } from '@/components/Toast';
import { Chips, Notice } from '@/components/Misc';
import { Text } from '@/components/Text';
import { OTHER_DISTRICT, districtOptions, splitDistrict } from '@/features/account/districts';

export default function Business() {
  const cafe = useSession((s) => s.me?.cafe);
  const [name, setName] = useState(cafe?.name ?? '');
  const initial = splitDistrict(cafe?.district ?? '');
  const [pick, setPick] = useState(initial.pick);
  const [other, setOther] = useState(initial.other);
  const district = pick === OTHER_DISTRICT ? other : pick;
  const [phone, setPhone] = useState(cafe ? formatTrPhone(cafe.phone) : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const phoneOk = !!normalizeTrPhone(phone);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api('/cafe', {
        method: 'PATCH',
        body: { name: name.trim(), district: district.trim(), phone },
      });
      await useSession.getState().refreshMe();
      toast('Kaydedildi');
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title={t('settings.business')}
      back
      footer={
        <Button
          title={t('common.save')}
          onPress={save}
          loading={busy}
          disabled={name.trim().length < 2 || district.trim().length < 2 || !phoneOk}
        />
      }
    >
      {error ? <Notice text={error} tone="danger" /> : null}
      <Field label={t('auth.cafeName')} value={name} onChangeText={setName} />
      <Text variant="caption">{t('auth.district').toLocaleUpperCase('tr')}</Text>
      <Chips options={districtOptions} value={pick} onChange={setPick} />
      {pick === OTHER_DISTRICT ? (
        <Field label={t('auth.district')} value={other} onChangeText={setOther} />
      ) : null}
      <Field
        label={t('auth.phone')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        hint={t('auth.phoneHint')}
        error={phone && !phoneOk ? 'Geçerli bir cep telefonu girin' : undefined}
      />
    </Screen>
  );
}
