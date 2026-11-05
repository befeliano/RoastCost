import { formatOrderNo, lineTotalKurus, selectTier } from '@roastcost/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/Card';
import { Chips, EmptyState, ErrorState, Pill, SectionTitle } from '@/components/Misc';
import { Icon } from '@/components/Icon';
import { Skeleton } from '@/components/Skeleton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { StatusCard } from '@/features/account/StatusCards';
import { tiersOf, useCatalog } from '@/features/catalog/store';
import { ORDER_TONE } from '@/features/orders/status';
import { useOrders } from '@/hooks/useCafeData';
import { formatDate, formatGramsKg, formatTRY } from '@/lib/format';
import { t } from '@/locales';
import { useCart } from '@/store/cart';
import { useSession } from '@/store/session';
import { colors, space, useColors } from '@/theme';
import { nav } from '@/lib/nav';

export default function Orders() {
  const cafe = useSession((s) => s.me?.cafe);
  const carts = useCart((s) => s.carts);
  const catalog = useCatalog();
  const orders = useOrders();
  const c = useColors();
  const [filter, setFilter] = useState<'all' | 'open' | 'confirmed' | 'closed'>('all');
  const all = orders.data?.items ?? [];
  const visible = all.filter((o) =>
    filter === 'all'
      ? true
      : filter === 'open'
        ? o.status === 'draft' || o.status === 'sent'
        : filter === 'confirmed'
          ? o.status === 'confirmed'
          : o.status === 'declined' || o.status === 'expired' || o.status === 'cancelled',
  );
  const now = new Date();
  const thisMonth = all.filter((o) => {
    const d = new Date(o.createdAt);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      o.status !== 'cancelled' &&
      o.status !== 'declined'
    );
  });
  const monthSpend = thisMonth.reduce((s, o) => s + o.subtotalKurus, 0);
  const monthCount = thisMonth.length;
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
            onPress: () => nav.push('/explore'),
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
            onPress={() => nav.push({ pathname: '/cart/[roasterId]', params: { roasterId } })}
            style={styles.row}
          >
            <View style={styles.flex}>
              <Text variant="h3">{catalog.roasters[roasterId]?.name ?? '—'}</Text>
              <Text variant="small">
                {t('orders.items', { n: Object.keys(c.items).length })} ·{' '}
                {formatGramsKg(Object.values(c.items).reduce((s, g) => s + g, 0))}
              </Text>
              {(() => {
                const min = catalog.roasters[roasterId]?.minOrderKg;
                const total = Object.values(c.items).reduce((s, g) => s + g, 0);
                return min && total < min * 1000 ? (
                  <Text variant="small" color={colors.warning}>
                    {t('orders.minMissing', {
                      kg: String(Math.round((min * 1000 - total) / 10) / 100).replace('.', ','),
                    })}
                  </Text>
                ) : null;
              })()}
            </View>
            <Text variant="money">{formatTRY(subtotal)}</Text>
          </Card>
        );
      })}

      <SectionTitle count={orders.data?.items.length}>{t('orders.history')}</SectionTitle>
      {monthSpend ? (
        <Card style={styles.row}>
          <Icon name="chart" color={c.primaryText} />
          <View style={styles.flex}>
            <Text variant="small">{t('orders.monthSpend')}</Text>
            <Text variant="h3">{formatTRY(monthSpend)}</Text>
          </View>
          <Text variant="small">{t('orders.monthOrders', { n: monthCount })}</Text>
        </Card>
      ) : null}
      {orders.data?.items.length ? (
        <Chips
          options={[
            { value: 'all' as const, label: t('catalog.all') },
            { value: 'open' as const, label: t('orders.filterOpen') },
            { value: 'confirmed' as const, label: t('orders.status.confirmed') },
            { value: 'closed' as const, label: t('orders.filterClosed') },
          ]}
          value={filter}
          onChange={setFilter}
        />
      ) : null}
      {orders.isLoading ? <Skeleton rows={2} /> : null}
      {orders.isError ? <ErrorState onRetry={() => void orders.refetch()} /> : null}
      {!orders.data?.items.length && !orders.isLoading && !orders.isError ? (
        <EmptyState compact title={t('orders.emptyHistory')} body={t('orders.emptyHistoryBody')} />
      ) : null}
      {visible.map((o) => (
        <Card
          key={o.id}
          onPress={() => nav.push({ pathname: '/order/[id]', params: { id: o.id } })}
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
