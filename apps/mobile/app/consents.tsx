import { router } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { Notice } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { openLegal, type LegalDoc } from '@/lib/legal';
import { t } from '@/locales';
import { useSession } from '@/store/session';

const LABEL = {
  terms: 'auth.acceptTerms',
  privacy: 'auth.acceptPrivacy',
  kvkk_notice: 'auth.acceptKvkk',
} as const;
const DOC: Record<keyof typeof LABEL, LegalDoc> = {
  terms: 'terms',
  privacy: 'privacy',
  kvkk_notice: 'kvkk',
};

/** Shown when a legal text version changed: new acceptance is required (spec §14.3). */
export default function Consents() {
  const me = useSession((s) => s.me);
  const missing = me?.missingConsents ?? [];
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const all = missing.every((d) => checked[d]);
  const accept = async () => {
    if (!me) return;
    setBusy(true);
    try {
      await api('/me/consents', {
        method: 'POST',
        body: { consents: missing.map((d) => ({ docType: d, docVersion: me.legalVersions[d] })) },
      });
      await useSession.getState().refreshMe();
      router.replace('/');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title={t('auth.newTermsTitle')}
      footer={<Button title={t('auth.accept')} onPress={accept} disabled={!all} loading={busy} />}
    >
      <Text variant="body">{t('auth.newTermsBody')}</Text>
      {missing.map((d) => (
        <Checkbox
          key={d}
          checked={!!checked[d]}
          onChange={(v) => setChecked((c) => ({ ...c, [d]: v }))}
          label={t(LABEL[d])}
          right={
            <Button
              title={t('auth.read')}
              variant="ghost"
              small
              onPress={() => openLegal(DOC[d])}
            />
          }
        />
      ))}
      <Notice text={t('auth.mustAccept')} tone="info" icon="list" />
      <Button
        title={t('settings.logout')}
        variant="ghost"
        onPress={() => void useSession.getState().signOut()}
      />
    </Screen>
  );
}
