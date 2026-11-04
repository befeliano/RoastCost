import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
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

const schema = z.object({
  email: z.string().trim().email(t('common.required')),
  password: z.string().min(1, t('common.required')),
});
type Form = z.infer<typeof schema>;

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const s = await api<Session>('/auth/login', {
        method: 'POST',
        body: { ...v, deviceLabel: 'mobile' },
        auth: false,
      });
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
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            error={formState.errors.password?.message}
            onSubmitEditing={() => void onSubmit()}
          />
        )}
      />
      <Button
        title={t('auth.login')}
        onPress={() => void onSubmit()}
        loading={formState.isSubmitting}
      />
      <Button title={t('auth.forgot')} variant="ghost" onPress={() => router.push('/forgot')} />
    </Screen>
  );
}
