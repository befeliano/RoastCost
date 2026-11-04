import { LEGAL_VERSIONS, normalizeTrPhone } from '@roastcost/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { api, ApiError } from '@/api/client';
import type { Session } from '@/api/types';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { Field } from '@/components/Field';
import { Chips, Notice } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { openLegal } from '@/lib/legal';
import { t } from '@/locales';
import { useSession } from '@/store/session';
import { colors, space } from '@/theme';

const DISTRICTS = ['Tepebaşı', 'Odunpazarı', 'Diğer'] as const;

export default function Register() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cafeName, setCafeName] = useState('');
  const [district, setDistrict] = useState<string>('Tepebaşı');
  const [otherDistrict, setOtherDistrict] = useState('');
  const [phone, setPhone] = useState('');
  const [accept, setAccept] = useState({ terms: false, privacy: false, kvkk: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const next1 = () => {
    const e: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Geçerli bir e-posta girin';
    if (password.length < 10) e.password = 'Parola en az 10 karakter olmalı';
    setErrors(e);
    if (!Object.keys(e).length) setStep(2);
  };
  const finalDistrict = district === 'Diğer' ? otherDistrict.trim() : district;
  const next2 = () => {
    const e: Record<string, string> = {};
    if (cafeName.trim().length < 2) e.cafeName = 'Kafe adı en az 2 karakter';
    if (finalDistrict.length < 2) e.district = 'İlçe girin';
    if (!normalizeTrPhone(phone)) e.phone = 'Geçerli bir cep telefonu girin (05xx xxx xx xx)';
    setErrors(e);
    if (!Object.keys(e).length) setStep(3);
  };
  const submit = async () => {
    if (!accept.terms || !accept.privacy || !accept.kvkk) {
      setErrors({ legal: t('auth.mustAccept') });
      return;
    }
    setBusy(true);
    setServerError(null);
    try {
      const s = await api<Session>('/auth/register', {
        method: 'POST',
        auth: false,
        body: {
          email: email.trim(),
          password,
          cafeName: cafeName.trim(),
          district: finalDistrict,
          phone,
          deviceLabel: 'mobile',
          consents: [
            { docType: 'terms', docVersion: LEGAL_VERSIONS.terms },
            { docType: 'privacy', docVersion: LEGAL_VERSIONS.privacy },
            { docType: 'kvkk_notice', docVersion: LEGAL_VERSIONS.kvkk_notice },
          ],
        },
      });
      await useSession.getState().signIn(s);
      router.replace('/');
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('common.unknownError'));
      if (e instanceof ApiError && e.code === 'email_taken') setStep(1);
    } finally {
      setBusy(false);
    }
  };

  const titles = ['', t('auth.stepAccount'), t('auth.stepBusiness'), t('auth.stepLegal')];
  return (
    <Screen
      title={t('auth.register')}
      back
      showOffline={false}
      footer={
        <View style={styles.footer}>
          {step > 1 ? (
            <Button
              title={t('common.back')}
              variant="secondary"
              onPress={() => setStep(step - 1)}
              style={styles.flex}
            />
          ) : null}
          <Button
            title={step < 3 ? t('common.continue') : t('auth.register')}
            onPress={step === 1 ? next1 : step === 2 ? next2 : submit}
            loading={busy}
            style={styles.flex}
          />
        </View>
      }
    >
      <View style={styles.progress} accessibilityLabel={t('auth.step', { n: step })}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[styles.dot, n <= step && styles.dotOn]} />
        ))}
      </View>
      <Text variant="caption">{t('auth.step', { n: step })}</Text>
      <Text variant="h2">{titles[step]}</Text>
      {serverError ? <Notice text={serverError} tone="danger" /> : null}
      <Animated.View key={step} entering={FadeInRight.duration(220)} style={styles.form}>
        {step === 1 ? (
          <>
            <Field
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              error={errors.email}
            />
            <Field
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              hint={t('auth.passwordHint')}
              error={errors.password}
            />
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Field
              label={t('auth.cafeName')}
              value={cafeName}
              onChangeText={setCafeName}
              autoComplete="organization"
              error={errors.cafeName}
            />
            <Text variant="caption">{t('auth.district').toUpperCase()}</Text>
            <Chips
              options={DISTRICTS.map((d) => ({ value: d, label: d }))}
              value={district}
              onChange={setDistrict}
            />
            {district === 'Diğer' ? (
              <Field
                label={t('auth.district')}
                value={otherDistrict}
                onChangeText={setOtherDistrict}
                error={errors.district}
              />
            ) : null}
            <Field
              label={t('auth.phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="05xx xxx xx xx"
              hint={t('auth.phoneHint')}
              error={errors.phone}
            />
          </>
        ) : null}
        {step === 3 ? (
          <>
            {(
              [
                ['terms', t('auth.acceptTerms'), 'terms'],
                ['privacy', t('auth.acceptPrivacy'), 'privacy'],
                ['kvkk', t('auth.acceptKvkk'), 'kvkk'],
              ] as const
            ).map(([k, label, doc]) => (
              <Checkbox
                key={k}
                checked={accept[k]}
                onChange={(v) => setAccept((a) => ({ ...a, [k]: v }))}
                label={label}
                right={
                  <Button
                    title={t('auth.read')}
                    variant="ghost"
                    small
                    onPress={() => openLegal(doc)}
                  />
                }
              />
            ))}
            {errors.legal ? (
              <Text variant="small" color={colors.danger}>
                {errors.legal}
              </Text>
            ) : null}
          </>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { flexDirection: 'row', gap: space.md },
  progress: { flexDirection: 'row', gap: 6 },
  dot: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.primary },
  form: { gap: space.md },
});
