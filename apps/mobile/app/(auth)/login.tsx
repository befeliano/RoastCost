import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import type { TextInputInstance } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { api, ApiError } from '@/api/client';
import type { Session } from '@/api/types';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Notice } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { t } from '@/locales';
import { useSession } from '@/store/session';
import { kv } from '@/lib/kv';
import { nav } from '@/lib/nav';

const schema = z.object({
  email: z.string().trim().email(t('common.required')),
  password: z.string().min(1, t('common.required')),
});
type Form = z.infer<typeof schema>;
const LAST_EMAIL = 'last_login_email';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const pwRef = useRef<TextInputInstance>(null);
  const { control, handleSubmit, formState, setValue } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  // remember the last e-mail on this device (never the password)
  useEffect(() => {
    void kv.getJSON<string>(LAST_EMAIL).then((e) => {
      if (e) setValue('email', e);
    });
  }, [setValue]);
  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const s = await api<Session>('/auth/login', {
        method: 'POST',
        body: { ...v, deviceLabel: 'mobile' },
        auth: false,
      });
      await kv.setJSON(LAST_EMAIL, v.email.trim());
      await useSession.getState().signIn(s);
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.unknownError'));
    }
  });
  return (
    <Screen title={t('auth.login')} back showOffline={false}>
      {error ? <Notice text={error} tone="danger" /> : null}
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <Field
            label={t('auth.email')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => pwRef.current?.focus()}
            error={formState.errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <Field
            label={t('auth.password')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            ref={pwRef}
            secureTextEntry
            returnKeyType="go"
            autoComplete="current-password"
            textContentType="password"
            error={formState.errors.password?.message}
            onSubmitEditing={() => void onSubmit()}
          />
        )}
      />
      <Button title={t('auth.login')} onPress={() => onSubmit()} loading={formState.isSubmitting} />
      <Button title={t('auth.forgot')} variant="ghost" onPress={() => nav.push('/forgot')} />
    </Screen>
  );
}
