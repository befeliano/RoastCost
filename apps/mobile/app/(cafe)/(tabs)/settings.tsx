import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { api, ApiError } from '@/api/client';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Notice, Row, SectionTitle } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { signOutEverywhere } from '@/features/account/signOut';
import { ThemePicker } from '@/features/account/ThemePicker';
import { openLegal } from '@/lib/legal';
import { t } from '@/locales';
import { useSession } from '@/store/session';
import { space } from '@/theme';

export default function Settings() {
  const me = useSession((s) => s.me);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    try {
      const data = await api<unknown>('/me/export');
      await Share.share({
        title: 'roastcost-verilerim.json',
        message: JSON.stringify(data, null, 2),
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.unknownError'));
    }
  };
  const deleteAccount = async () => {
    setBusy(true);
    setError(null);
    try {
      await api('/me', { method: 'DELETE', body: { password } });
      setDeleting(false);
      await signOutEverywhere();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={t('settings.title')}>
      {me?.cafe ? (
        <Card>
          <Text variant="h3">{me.cafe.name}</Text>
          <Text variant="small">
            {me.cafe.district} · {me.user.email}
          </Text>
        </Card>
      ) : null}
      {error ? <Notice text={error} tone="danger" /> : null}
      <View>
        <Row icon="store" title={t('settings.business')} onPress={() => router.push('/business')} />
        <Row icon="chart" title={t('settings.costParams')} onPress={() => router.push('/costs')} />
        <Row
          icon="cup"
          title={t('settings.ingredients')}
          onPress={() => router.push('/ingredients')}
        />
      </View>
      <SectionTitle>{t('settings.appearance')}</SectionTitle>
      <ThemePicker />
      <SectionTitle>{t('settings.account')}</SectionTitle>
      <View>
        <Row
          icon="gear"
          title={t('settings.changePassword')}
          onPress={() => router.push('/password')}
        />
        <Row
          icon="copy"
          title={t('settings.export')}
          subtitle={t('settings.exportBody')}
          onPress={() => void exportData()}
        />
      </View>
      <SectionTitle>{t('settings.legal')}</SectionTitle>
      <View>
        <Row icon="book" title={t('settings.terms')} onPress={() => openLegal('terms')} />
        <Row icon="book" title={t('settings.privacy')} onPress={() => openLegal('privacy')} />
        <Row icon="book" title={t('settings.kvkk')} onPress={() => openLegal('kvkk')} />
      </View>
      <Button
        title={t('settings.logout')}
        variant="secondary"
        onPress={() => void signOutEverywhere()}
      />
      <Button
        title={t('settings.deleteAccount')}
        variant="danger"
        icon="trash"
        onPress={() => setDeleting(true)}
      />
      <Text variant="caption" style={styles.center}>
        {t('settings.version', { v: Constants.expoConfig?.version ?? '' })}
      </Text>

      <BottomSheet
        visible={deleting}
        onClose={() => setDeleting(false)}
        title={t('settings.deleteAccount')}
      >
        <Text variant="body">{t('settings.deleteBody')}</Text>
        <Field
          label={t('settings.deleteConfirm')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
        />
        {error ? <Notice text={error} tone="danger" /> : null}
        <Button
          title={t('settings.deleteAccount')}
          variant="danger"
          onPress={() => void deleteAccount()}
          loading={busy}
          disabled={!password}
        />
        <Button title={t('common.cancel')} variant="ghost" onPress={() => setDeleting(false)} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({ center: { textAlign: 'center', marginTop: space.lg } });
