import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import { api } from '@/api/client';
import type { AdminStats, AdminRoaster } from '@/api/types';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { signOutEverywhere } from '@/features/account/signOut';
import { ThemePicker } from '@/features/account/ThemePicker';
import { t } from '@/locales';
import { colors, space, useColors } from '@/theme';
import { formatTRY } from '@/lib/format';
import { Notice, Row } from '@/components/Misc';
import { daysSince } from '@/lib/format';
import { nav } from '@/lib/nav';
import { LoadState } from '@/components/LoadState';

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
  const c = useColors();
  return (
    <Card style={styles.stat} onPress={onPress}>
      <AnimatedNumber
        variant="h1"
        color={alert && value > 0 ? c.primaryText : colors.text}
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
  const roasters = useQuery({
    queryKey: ['admin', 'roasters'],
    queryFn: () => api<AdminRoaster[]>('/admin/roasters'),
  });
  const stale = (roasters.data ?? []).filter(
    (r) => r.isActive && (!r.pricesUpdatedAt || daysSince(r.pricesUpdatedAt) > 30),
  );
  return (
    <Screen title={t('admin.panel')} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <LoadState q={q} />
      {s ? (
        <View style={styles.grid}>
          <Stat
            label={t('admin.pendingCafes')}
            value={s.pendingCafes}
            alert
            onPress={() => nav.push('/cafes')}
          />
          <Stat label={t('admin.approvedCafes')} value={s.approvedCafes} />
          <Stat
            label={t('admin.toCollect')}
            value={s.commissionToCollectKurus}
            money
            alert
            onPress={() => nav.push('/commission')}
          />
          <Stat label={t('admin.requested')} value={s.commissionRequestedKurus} money />
          <Stat label={t('admin.ordersMonth')} value={s.ordersThisMonth} />
          <Stat
            label={t('admin.conflicts')}
            value={s.commissionConflicts}
            alert
            onPress={() => nav.push('/commission')}
          />
        </View>
      ) : null}
      {stale.length ? (
        <Card style={styles.staleCard}>
          <Notice tone="warning" text={t('admin.staleTitle', { n: stale.length })} />
          {stale.map((r) => (
            <Row
              key={r.id}
              title={r.name}
              subtitle={
                r.pricesUpdatedAt
                  ? t('admin.staleDays', { days: daysSince(r.pricesUpdatedAt) })
                  : t('admin.staleNever')
              }
              onPress={() => nav.push({ pathname: '/roaster-edit/[id]', params: { id: r.id } })}
            />
          ))}
        </Card>
      ) : null}
      <ThemePicker />
      <Button
        title={t('settings.logout')}
        variant="secondary"
        onPress={() => signOutEverywhere()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  staleCard: { gap: 8, padding: 0, paddingTop: 12, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  stat: { width: '47%', gap: 4 },
});
