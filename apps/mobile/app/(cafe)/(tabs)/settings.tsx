import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Share, StyleSheet, View } from 'react-native';
import { api, ApiError } from '@/api/client';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Notice, Row, RowGroup, SectionTitle } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { signOutEverywhere } from '@/features/account/signOut';
import { ThemePicker } from '@/features/account/ThemePicker';
import { openLegal } from '@/lib/legal';
import { t } from '@/locales';
import { useSession } from '@/store/session';
import { space } from '@/theme';
import { RoasterAvatar } from '@/components/RoasterAvatar';
import { confirm } from '@/lib/confirm';

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
        <Card style={styles.profile}>
          <RoasterAvatar name={me.cafe.name} size={48} />
          <View style={styles.flex}>
            <Text variant="h3">{me.cafe.name}</Text>
            <Text variant="small">
              {me.cafe.district} · {me.user.email}
            </Text>
          </View>
        </Card>
      ) : null}
      {error ? <Notice text={error} tone="danger" /> : null}
      <RowGroup>
        <Row icon="store" title={t('settings.business')} onPress={() => router.push('/business')} />
        <Row icon="chart" title={t('settings.costParams')} onPress={() => router.push('/costs')} />
        <Row
          icon="cup"
          title={t('settings.ingredients')}
          onPress={() => router.push('/ingredients')}
        />
      </RowGroup>
      <SectionTitle>{t('settings.appearance')}</SectionTitle>
      <ThemePicker />
      <SectionTitle>{t('settings.account')}</SectionTitle>
      <RowGroup>
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
      </RowGroup>
      <SectionTitle>{t('settings.legal')}</SectionTitle>
      <RowGroup>
        <Row icon="book" title={t('settings.terms')} onPress={() => openLegal('terms')} />
        <Row icon="book" title={t('settings.privacy')} onPress={() => openLegal('privacy')} />
        <Row icon="book" title={t('settings.kvkk')} onPress={() => openLegal('kvkk')} />
      </RowGroup>
      <SectionTitle>{t('settings.more')}</SectionTitle>
      <RowGroup>
        <Row
          icon="share"
          title={t('settings.recommend')}
          subtitle={t('settings.recommendBody')}
          onPress={() => void Share.share({ message: t('settings.recommendMessage') })}
        />
        {SUPPORT_EMAIL ? (
          <Row
            icon="mail"
            title={t('settings.support')}
            subtitle={SUPPORT_EMAIL}
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=RoastCost`)}
          />
        ) : null}
      </RowGroup>
      <Button
        title={t('settings.logout')}
        variant="secondary"
        onPress={async () => {
          if (await confirm(t('settings.logoutConfirm'), undefined, t('settings.logout')))
            void signOutEverywhere();
        }}
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

/** Set EXPO_PUBLIC_SUPPORT_EMAIL at build time; the row is hidden until a real address exists. */
const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

const styles = StyleSheet.create({
  center: { textAlign: 'center', marginTop: space.lg },
  flex: { flex: 1 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
