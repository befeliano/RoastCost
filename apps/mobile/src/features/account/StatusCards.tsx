import type { CafeStatus } from '@roastcost/shared';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { api, ApiError } from '@/api/client';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Notice } from '@/components/Misc';
import { Text } from '@/components/Text';
import { t } from '@/locales';
import { useSession } from '@/store/session';
import { space, useColors } from '@/theme';

/** "Onay bekleniyor" card with a soft breathing animation (spec §10.1). */
export function StatusCard({
  status,
  note,
  compact,
}: {
  status: CafeStatus;
  note?: string | null;
  compact?: boolean;
}) {
  const reduce = useReducedMotion();
  const c = useColors();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!reduce && status === 'pending')
      pulse.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 900 }), withTiming(1, { duration: 900 })),
        -1,
      );
  }, [reduce, status, pulse]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  if (status === 'approved') return null;
  const title =
    status === 'pending'
      ? t('auth.pendingTitle')
      : status === 'rejected'
        ? t('auth.rejectedTitle')
        : t('auth.suspendedTitle');
  return (
    <Card style={[styles.card, compact && styles.compact]}>
      <Animated.View style={[styles.icon, anim]}>
        <Icon
          name={status === 'pending' ? 'clock' : 'warning'}
          size={compact ? 24 : 36}
          color={c.primaryText}
        />
      </Animated.View>
      <View style={styles.flex}>
        <Text variant="h3">{title}</Text>
        {!compact || status !== 'pending' ? (
          <Text variant="small">{status === 'pending' ? t('auth.pendingBody') : (note ?? '')}</Text>
        ) : null}
      </View>
    </Card>
  );
}

export function EmailVerifyNotice({ email }: { email: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Card style={styles.verify}>
      <Notice text={t('auth.verifyBody', { email })} tone="info" icon="send" />
      {msg ? <Text variant="small">{msg}</Text> : null}
      <View style={styles.row}>
        <Button
          small
          variant="secondary"
          title={t('auth.resend')}
          loading={busy}
          style={styles.flex}
          onPress={async () => {
            setBusy(true);
            try {
              await api('/auth/resend-verification', { method: 'POST' });
              setMsg(t('auth.resent'));
            } catch (e) {
              setMsg(e instanceof ApiError ? e.message : t('common.unknownError'));
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button
          small
          title={t('auth.verifiedCheck')}
          style={styles.flex}
          onPress={() => void useSession.getState().refreshMe()}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.xl },
  compact: { paddingVertical: space.md },
  icon: { width: 48, alignItems: 'center' },
  verify: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
});
