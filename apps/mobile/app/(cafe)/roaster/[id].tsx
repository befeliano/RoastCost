import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import type { CatalogProduct } from '@/api/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Chips, Pill } from '@/components/Misc';
import { toast } from '@/components/Toast';
import { RoasterAvatar } from '@/components/RoasterAvatar';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Freshness } from '@/features/catalog/Freshness';
import { RoastDots } from '@/features/catalog/RoastDots';
import { productsOf, tiersOf, useCatalog } from '@/features/catalog/store';
import { t } from '@/locales';
import { useCart } from '@/store/cart';
import { colors, space, useColors } from '@/theme';
import { formatGramsKg, formatTRY } from '@/lib/format';
import { NoteChips } from '@/features/catalog/NoteChips';
import { Skeleton } from '@/components/Skeleton';

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
        {inCart ? <Pill tone="primary" icon="check" label={formatGramsKg(inCart)} /> : null}
      </View>
      <NoteChips notes={p.tastingNotes} max={4} />
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
      {best && from && best !== from && best.pricePerKgKurus < from.pricePerKgKurus ? (
        <Text variant="small" color={colors.success}>
          {t('catalog.bestTier', { kg: best.minKg, price: formatTRY(best.pricePerKgKurus) })}
        </Text>
      ) : null}
    </Card>
  );
}

export default function RoasterDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const c = useColors();
  const roaster = catalog.roasters[id];
  const cartItems = useCart((s) => s.carts[id]?.items);
  const cartCount = Object.keys(cartItems ?? {}).length;
  const [cat, setCat] = useState<'all' | 'espresso' | 'filter'>('all');
  const [sort, setSort] = useState<'default' | 'price'>('default');
  if (!roaster) {
    return (
      <Screen title={t('catalog.title')} back>
        <Skeleton rows={4} />
      </Screen>
    );
  }
  const products = productsOf(catalog, id);
  const fromPrice = (pid: string) => tiersOf(catalog, pid)[0]?.pricePerKgKurus ?? Infinity;
  const ordered =
    sort === 'price' ? [...products].sort((a, b) => fromPrice(a.id) - fromPrice(b.id)) : products;
  const espresso = ordered.filter((p) => p.category === 'espresso');
  const filter = ordered.filter((p) => p.category === 'filter');
  const cartG = Object.values(cartItems ?? {}).reduce((s, g) => s + g, 0);
  return (
    <Screen
      title={roaster.name}
      back
      footer={
        cartCount ? (
          <Button
            title={`${t('orders.carts')} · ${formatGramsKg(cartG)}`}
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
        {roaster.address ? (
          <Pressable
            accessibilityRole="button"
            accessibilityHint={t('catalog.copyAddress')}
            onPress={() => {
              void Clipboard.setStringAsync(roaster.address ?? '');
              toast(t('catalog.addressCopied'), 'copy');
            }}
            style={styles.row}
          >
            <Icon name="pin" size={16} color={colors.textMuted} />
            <Text variant="small" style={styles.flex}>
              {roaster.address}
            </Text>
            <Icon name="copy" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
        {roaster.latitude !== null && roaster.longitude !== null ? (
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              void Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${roaster.latitude},${roaster.longitude}`,
              )
            }
            style={styles.row}
            hitSlop={6}
          >
            <Icon name="send" size={16} color={c.primaryText} />
            <Text variant="bodyStrong" color={c.primaryText}>
              {t('catalog.directions')}
            </Text>
          </Pressable>
        ) : null}
        {roaster.minOrderKg || roaster.cardSurchargeBp ? (
          <View style={[styles.terms, { backgroundColor: c.primaryBg }]}>
            <Text variant="caption" color={c.primaryText}>
              {t('catalog.terms').toUpperCase()}
            </Text>
            {roaster.minOrderKg ? (
              <Text variant="small" color={colors.text}>
                {t('catalog.termsMin', { kg: String(roaster.minOrderKg).replace('.', ',') })}
              </Text>
            ) : null}
            {roaster.cardSurchargeBp ? (
              <Text variant="small" color={colors.text}>
                {t('catalog.termsCard', {
                  pct: String(roaster.cardSurchargeBp / 100).replace('.', ','),
                })}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={styles.pills}>
          <Freshness iso={roaster.pricesUpdatedAt} />
          <Pill
            label={roaster.pricesIncludeVat ? t('catalog.vatIncluded') : t('catalog.vatExcluded')}
          />
          <Pill tone="info" label={t('explore.counts', { e: espresso.length, f: filter.length })} />
        </View>
      </Card>

      <View style={styles.tools}>
        <View style={styles.flex}>
          <Chips
            options={[
              { value: 'all' as const, label: t('catalog.all') },
              { value: 'espresso' as const, label: t('catalog.espresso') },
              { value: 'filter' as const, label: t('catalog.filter') },
            ]}
            value={cat}
            onChange={setCat}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={sort === 'price' ? t('catalog.sortDefault') : t('catalog.sortPrice')}
          onPress={() => setSort((v) => (v === 'price' ? 'default' : 'price'))}
          style={[styles.sortBtn, sort === 'price' && { borderColor: c.primaryText }]}
        >
          <Icon name="sort" size={18} color={sort === 'price' ? c.primaryText : colors.textMuted} />
          <Text variant="caption" color={sort === 'price' ? c.primaryText : colors.textMuted}>
            {t('catalog.sortPriceShort')}
          </Text>
        </Pressable>
      </View>
      {espresso.length && cat !== 'filter' ? (
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
      {filter.length && cat !== 'espresso' ? (
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
  terms: { borderRadius: 10, padding: space.md, gap: 2 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
});
