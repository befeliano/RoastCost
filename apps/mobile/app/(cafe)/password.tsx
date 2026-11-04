import { useState } from 'react';
import { api, ApiError } from '@/api/client';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Notice } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { t } from '@/locales';
import { signOutEverywhere } from '@/features/account/signOut';

export default function Password() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api('/me/change-password', {
        method: 'POST',
        body: { currentPassword: current, newPassword: next },
      });
      // the server revoked every session → log in again with the new password
      await signOutEverywhere();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title={t('settings.changePassword')}
      back
      footer={
        <Button
          title={t('common.save')}
          onPress={save}
          loading={busy}
          disabled={!current || next.length < 10}
        />
      }
    >
      {error ? <Notice text={error} tone="danger" /> : null}
      <Field
        label={t('settings.currentPassword')}
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoComplete="current-password"
      />
      <Field
        label={t('settings.newPassword')}
        value={next}
        onChangeText={setNext}
        secureTextEntry
        autoComplete="new-password"
        hint={t('auth.passwordHint')}
      />
      <Notice text={t('settings.passwordChanged')} tone="info" icon="refresh" />
    </Screen>
  );
}
