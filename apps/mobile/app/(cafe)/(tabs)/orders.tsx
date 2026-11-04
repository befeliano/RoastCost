import { formatOrderNo, lineTotalKurus, selectTier } from '@roastcost/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState, ErrorState, Pill, SectionTitle } from '@/components/Misc';
import { Skeleton } from '@/components/Skeleton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { StatusCard } from '@/features/account/StatusCards';
import { tiersOf, useCatalog } from '@/features/catalog/store';
import { ORDER_TONE } from '@/features/orders/status';
import { useOrders } from '@/hooks/useCafeData';
import { formatDate, formatTRY } from '@/lib/format';
import { t } from '@/locales';
import { useCart } from '@/store/cart';
import { useSession } from '@/store/session';
import { space } from '@/theme';

export default function Orders() {
  const cafe = useSession((s) => s.me?.cafe);
  const carts = useCart((s) => s.carts);
  const catalog = useCatalog();
  const orders = useOrders();
  if (cafe && cafe.status !== 'approved') {
    return (
      <Screen title={t('orders.title')}>
        <StatusCard status={cafe.status} note={cafe.statusNote} />
      </Screen>
    );
  }
  const cartEntries = Object.entries(carts).filter(([, c]) => Object.keys(c.items).length);
  return (
    <Screen
      title={t('orders.title')}
      onRefresh={() => void orders.refetch()}
      refreshing={orders.isRefetching}
    >
      <SectionTitle count={cartEntries.length}>{t('orders.carts')}</SectionTitle>
      {!cartEntries.length ? (
        <EmptyState
          title={t('orders.emptyCartTitle')}
          body={t('orders.emptyCart')}
          action={{
            label: t('orders.goExplore'),
            icon: 'store',
            onPress: () => router.push('/explore'),
          }}
        />
      ) : null}
      {cartEntries.map(([roasterId, c]) => {
        const subtotal = Object.entries(c.items).reduce((sum, [pid, g]) => {
          const tier = selectTier(tiersOf(catalog, pid), g / 1000);
          return sum + (tier ? lineTotalKurus(g, tier.pricePerKgKurus) : 0);
        }, 0);
        return (
          <Card
            key={roasterId}
            onPress={() => router.push({ pathname: '/cart/[roasterId]', params: { roasterId } })}
            style={styles.row}
          >
            <View style={styles.flex}>
              <Text variant="h3">{catalog.roasters[roasterId]?.name ?? '—'}</Text>
              <Text variant="small">{t('orders.items', { n: Object.keys(c.items).length })}</Text>
            </View>
            <Text variant="money">{formatTRY(subtotal)}</Text>
          </Card>
        );
      })}

      <SectionTitle count={orders.data?.items.length}>{t('orders.history')}</SectionTitle>
      {orders.isLoading ? <Skeleton rows={2} /> : null}
      {orders.isError ? <ErrorState onRetry={() => void orders.refetch()} /> : null}
      {!orders.data?.items.length && !orders.isLoading && !orders.isError ? (
        <EmptyState title={t('orders.emptyHistory')} />
      ) : null}
      {orders.data?.items.map((o) => (
        <Card
          key={o.id}
          onPress={() => router.push({ pathname: '/order/[id]', params: { id: o.id } })}
          style={styles.gap}
        >
          <View style={styles.row}>
            <Text variant="h3" style={styles.flex}>
              {o.roasterName}
            </Text>
            <Text variant="money">{formatTRY(o.subtotalKurus)}</Text>
          </View>
          <View style={styles.row}>
            <Text variant="small" style={styles.flex}>
              {formatOrderNo(o.orderNo)} · {formatDate(o.createdAt)}
            </Text>
            <Pill tone={ORDER_TONE[o.status]} label={t(`orders.status.${o.status}`)} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  gap: { gap: space.xs },
});
