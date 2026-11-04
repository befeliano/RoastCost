import { formatTRY } from '@roastcost/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { CatalogProduct } from '@/api/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Misc';
import { RoasterAvatar } from '@/components/RoasterAvatar';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Freshness } from '@/features/catalog/Freshness';
import { RoastDots } from '@/features/catalog/RoastDots';
import { productsOf, tiersOf, useCatalog } from '@/features/catalog/store';
import { t } from '@/locales';
import { useCart } from '@/store/cart';
import { colors, space, useColors } from '@/theme';

function ProductRow({ p }: { p: CatalogProduct }) {
  const catalog = useCatalog();
  const c = useColors();
  const inCart = useCart((s) => s.carts[p.roasterId]?.items[p.id]);
  const tiers = tiersOf(catalog, p.id);
  const from = tiers[0];
  const best = tiers[tiers.length - 1];
  return (
    <Card
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
      style={styles.product}
      accessibilityLabel={p.name}
    >
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="h3">{p.name}</Text>
          <Text variant="small">
            {[p.origin, p.process ? t(`catalog.process.${p.process}`) : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        {inCart ? <Pill tone="primary" icon="check" label={`${inCart / 1000} kg`} /> : null}
      </View>
      {p.tastingNotes ? (
        <Text variant="small" color={colors.text}>
          {p.tastingNotes}
        </Text>
      ) : null}
      <View style={styles.row}>
        <RoastDots level={p.roastLevel} />
        <View style={styles.flex} />
        {from ? (
          <Text variant="bodyStrong" color={c.primaryText}>
            {formatTRY(from.pricePerKgKurus)}/kg
          </Text>
        ) : null}
        <Icon name="chevron" size={18} color={colors.textMuted} />
      </View>
      {best && from && best !== from ? (
        <Text variant="caption">
          {t('catalog.bestTier', { kg: best.minKg, price: formatTRY(best.pricePerKgKurus) })}
        </Text>
      ) : null}
    </Card>
  );
}

export default function RoasterDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const roaster = catalog.roasters[id];
  const cartCount = useCart((s) => Object.keys(s.carts[id]?.items ?? {}).length);
  if (!roaster) {
    return (
      <Screen title={t('catalog.title')} back>
        <Text>{t('common.loading')}</Text>
      </Screen>
    );
  }
  const products = productsOf(catalog, id);
  const espresso = products.filter((p) => p.category === 'espresso');
  const filter = products.filter((p) => p.category === 'filter');
  return (
    <Screen
      title={roaster.name}
      back
      footer={
        cartCount ? (
          <Button
            title={`${t('orders.carts')} · ${t('orders.items', { n: cartCount })}`}
            icon="box"
            onPress={() =>
              router.push({ pathname: '/cart/[roasterId]', params: { roasterId: id } })
            }
          />
        ) : undefined
      }
    >
      <Card style={styles.header}>
        <View style={styles.headerRow}>
          <RoasterAvatar
            name={roaster.name}
            logoUrl={roaster.logoUrl}
            color={roaster.brandColor}
            size={56}
          />
          <View style={styles.flex}>
            <Text variant="h2">{roaster.name}</Text>
            <Text variant="small">
              {[roaster.district, roaster.city].filter(Boolean).join(', ')}
            </Text>
          </View>
        </View>
        {roaster.description ? <Text variant="body">{roaster.description}</Text> : null}
        {roaster.address ? <Text variant="small">{roaster.address}</Text> : null}
        <View style={styles.pills}>
          <Freshness iso={roaster.pricesUpdatedAt} />
          <Pill
            label={roaster.pricesIncludeVat ? t('catalog.vatIncluded') : t('catalog.vatExcluded')}
          />
          <Pill tone="info" label={t('explore.counts', { e: espresso.length, f: filter.length })} />
        </View>
      </Card>

      {espresso.length ? (
        <>
          <Text variant="h2" style={styles.section}>
            {t('catalog.espresso')}{' '}
            <Text variant="h3" color={colors.textMuted}>
              ({espresso.length})
            </Text>
          </Text>
          {espresso.map((p) => (
            <ProductRow key={p.id} p={p} />
          ))}
        </>
      ) : null}
      {filter.length ? (
        <>
          <Text variant="h2" style={styles.section}>
            {t('catalog.filter')}{' '}
            <Text variant="h3" color={colors.textMuted}>
              ({filter.length})
            </Text>
          </Text>
          {filter.map((p) => (
            <ProductRow key={p.id} p={p} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  header: { gap: space.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  section: { marginTop: space.md },
  product: { gap: space.sm },
});
