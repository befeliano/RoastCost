import { useState } from 'react';
import { api, ApiError } from '@/api/client';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Notice } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { t } from '@/locales';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    setState('busy');
    setError(null);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email }, auth: false });
      setState('sent');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.unknownError'));
      setState('idle');
    }
  };
  return (
    <Screen title={t('auth.forgotTitle')} back showOffline={false}>
      <Text variant="body">{t('auth.forgotBody')}</Text>
      {state === 'sent' ? <Notice text={t('auth.forgotSent')} tone="success" icon="check" /> : null}
      {error ? <Notice text={error} tone="danger" /> : null}
      <Field
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <Button
        title={t('auth.send')}
        onPress={send}
        loading={state === 'busy'}
        disabled={!email.includes('@')}
      />
    </Screen>
  );
}
