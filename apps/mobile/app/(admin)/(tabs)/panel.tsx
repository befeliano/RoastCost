import { formatTRY } from '@roastcost/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { api } from '@/api/client';
import type { AdminStats } from '@/api/types';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { signOutEverywhere } from '@/features/account/signOut';
import { t } from '@/locales';
import { colors, space } from '@/theme';

function Stat({
  label,
  value,
  money,
  onPress,
  alert,
}: {
  label: string;
  value: number;
  money?: boolean;
  onPress?: () => void;
  alert?: boolean;
}) {
  return (
    <Card style={styles.stat} onPress={onPress}>
      <AnimatedNumber
        variant="h1"
        color={alert && value > 0 ? colors.primary : colors.text}
        value={value}
        format={(n) => (money ? formatTRY(n) : String(n))}
      />
      <Text variant="small">{label}</Text>
    </Card>
  );
}

export default function Panel() {
  const q = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api<AdminStats>('/admin/stats'),
  });
  const s = q.data;
  return (
    <Screen title={t('admin.panel')} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {s ? (
        <View style={styles.grid}>
          <Stat
            label={t('admin.pendingCafes')}
            value={s.pendingCafes}
            alert
            onPress={() => router.push('/cafes')}
          />
          <Stat label={t('admin.approvedCafes')} value={s.approvedCafes} />
          <Stat
            label={t('admin.toCollect')}
            value={s.commissionToCollectKurus}
            money
            alert
            onPress={() => router.push('/commission')}
          />
          <Stat label={t('admin.requested')} value={s.commissionRequestedKurus} money />
          <Stat label={t('admin.ordersMonth')} value={s.ordersThisMonth} />
          <Stat
            label={t('admin.conflicts')}
            value={s.commissionConflicts}
            alert
            onPress={() => router.push('/commission')}
          />
        </View>
      ) : null}
      <Button
        title={t('settings.logout')}
        variant="secondary"
        onPress={() => void signOutEverywhere()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  stat: { width: '47%', gap: 4 },
});
