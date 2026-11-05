import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Chips, EmptyState, Row, RowGroup, SectionTitle } from '@/components/Misc';
import { RoasterAvatar } from '@/components/RoasterAvatar';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { EmailVerifyNotice, StatusCard } from '@/features/account/StatusCards';
import { districtsOf, roasterStats } from '@/features/catalog/stats';
import { activeRoasters, tiersOf, useCatalog } from '@/features/catalog/store';
import { useCheapestEspresso, useCupCost } from '@/features/cost/useCupCost';
import { useTips } from '@/store/tips';
import { CityMap, TurkeyMap } from '@/features/explore/Maps';
import { t } from '@/locales';
import { useSession } from '@/store/session';
import { colors, fonts, radius, space, useColors } from '@/theme';
import { formatTRY } from '@/lib/format';
import { Skeleton } from '@/components/Skeleton';
import { nav } from '@/lib/nav';
import { Tap } from '@/components/Tap';

function greeting(name: string, now = new Date()) {
  const h = now.getHours();
  const key =
    h >= 5 && h < 12
      ? 'morning'
      : h < 18 && h >= 12
        ? 'day'
        : h >= 18 && h < 23
          ? 'evening'
          : 'night';
  return t(`explore.greet.${key}`, { name });
}

export default function Explore() {
  const me = useSession((s) => s.me);
  const catalog = useCatalog();
  const c = useColors();
  const reduce = useReducedMotion();
  const [district, setDistrict] = useState<string>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const tipSeen = useTips((s) => s.exploreTip);
  const hideTip = useTips((s) => s.hide);
  const cup = useCupCost();
  const cheapest = useCheapestEspresso();
  const qn = query.trim().toLocaleLowerCase('tr');
  const hits = useMemo(() => {
    if (qn.length < 2) return null;
    const has = (...xs: (string | null | undefined)[]) =>
      xs.some((x) => x?.toLocaleLowerCase('tr').includes(qn));
    return {
      roasters: activeRoasters(catalog).filter((r) => has(r.name, r.district, r.address)),
      products: Object.values(catalog.products)
        .filter((p) => p.isActive && !p.deletedAt && catalog.roasters[p.roasterId]?.isActive)
        .filter((p) => has(p.name, p.origin, p.tastingNotes, catalog.roasters[p.roasterId]?.name))
        .slice(0, 30),
    };
  }, [qn, catalog]);
  const roasters = useMemo(() => activeRoasters(catalog), [catalog]);
  const featured = roasters.filter((r) => r.isFeatured).length
    ? roasters.filter((r) => r.isFeatured)
    : roasters.slice(0, 5);
  const districts = districtsOf(roasters);
  const list = district === 'all' ? roasters : roasters.filter((r) => r.district === district);
  const sel = selected ? catalog.roasters[selected] : undefined;
  const open = (id: string) => nav.push({ pathname: '/roaster/[id]', params: { id } });
  const cafe = me?.cafe;

  if (cafe && cafe.status !== 'approved') {
    return (
      <Screen title={t('explore.title')} subtitle={greeting(cafe.name)}>
        <StatusCard status={cafe.status} note={cafe.statusNote} />
        {me && !me.user.emailVerified ? <EmailVerifyNotice email={me.user.email} /> : null}
        <EmptyState title={t('explore.pendingTitle')} body={t('explore.pendingBody')} />
        <Button title={t('explore.calc')} icon="cup" onPress={() => nav.push('/cost')} />
      </Screen>
    );
  }

  return (
    <Screen
      title={t('explore.title')}
      subtitle={cafe ? greeting(cafe.name) : undefined}
      onRefresh={() => void catalog.sync({ force: true })}
      refreshing={catalog.syncing}
    >
      {me && !me.user.emailVerified ? <EmailVerifyNotice email={me.user.email} /> : null}

      <View style={styles.search}>
        <Icon name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('explore.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('common.search')}
          autoCorrect={false}
          returnKeyType="search"
          maxFontSizeMultiplier={1.6}
          keyboardAppearance="light"
          style={styles.searchInput}
        />
        {query ? (
          <Tap
            accessibilityRole="button"
            accessibilityLabel="Temizle"
            onPress={() => setQuery('')}
            hitSlop={13}
          >
            <Icon name="close" size={18} color={colors.textMuted} />
          </Tap>
        ) : null}
      </View>

      {hits ? (
        <>
          <SectionTitle count={hits.roasters.length + hits.products.length}>
            {t('explore.results')}
          </SectionTitle>
          {!hits.roasters.length && !hits.products.length ? (
            <EmptyState title={t('explore.noResults')} body={t('explore.noResultsBody')} />
          ) : null}
          {hits.roasters.length || hits.products.length ? (
            <RowGroup>
              {hits.roasters.map((r) => (
                <Row
                  key={r.id}
                  left={
                    <RoasterAvatar
                      name={r.name}
                      logoUrl={r.logoUrl}
                      color={r.brandColor}
                      size={36}
                    />
                  }
                  title={r.name}
                  subtitle={r.district ?? r.city}
                  onPress={() => open(r.id)}
                />
              ))}
              {hits.products.map((p) => {
                const tier = tiersOf(catalog, p.id)[0];
                return (
                  <Row
                    key={p.id}
                    icon="bean"
                    title={p.name}
                    subtitle={[
                      catalog.roasters[p.roasterId]?.name,
                      p.category === 'espresso' ? t('catalog.espresso') : t('catalog.filter'),
                      tier ? `${formatTRY(tier.pricePerKgKurus)}/kg` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    onPress={() => nav.push({ pathname: '/product/[id]', params: { id: p.id } })}
                  />
                );
              })}
            </RowGroup>
          ) : null}
        </>
      ) : (
        <>
          {!tipSeen && roasters.length ? (
            <View style={[styles.tip, { backgroundColor: c.primaryBg }]}>
              <Icon name="spark" size={20} color={c.primaryText} />
              <Text variant="small" color={colors.text} style={styles.flex}>
                {t('explore.tip')}
              </Text>
              <Tap
                accessibilityRole="button"
                accessibilityLabel="Kapat"
                onPress={hideTip}
                hitSlop={13}
              >
                <Icon name="close" size={18} color={colors.textMuted} />
              </Tap>
            </View>
          ) : null}

          <View style={styles.quick}>
            <Tap
              accessibilityRole="button"
              onPress={() => nav.push('/cost')}
              style={[styles.quickCard, { backgroundColor: c.primary, overflow: 'hidden' }]}
            >
              <LinearGradient
                colors={c.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.4 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.layer}>
                <Icon name="cup" color={c.onPrimary} size={28} />
              </View>
              <View>
                <Text variant="bodyStrong" color={c.onPrimary}>
                  {t('explore.calc')}
                </Text>
                {cup.result && cup.recipe && cup.source ? (
                  <Text variant="small" color={c.onPrimary} style={styles.quickSub}>
                    {cup.recipe.name} · {formatTRY(cup.result.totalKurus)}
                  </Text>
                ) : null}
              </View>
            </Tap>
            <Tap
              accessibilityRole="button"
              onPress={() => nav.push('/compare')}
              style={[styles.quickCard, { backgroundColor: c.accent, overflow: 'hidden' }]}
            >
              <Icon name="chart" color={c.onAccent} size={28} />
              <View>
                <Text variant="bodyStrong" color={c.onAccent}>
                  {t('explore.compare')}
                </Text>
                {cheapest.length ? (
                  <Text variant="small" color={c.onAccent} style={styles.quickSub}>
                    {t('explore.beanCount', { n: Object.keys(catalog.products).length })}
                  </Text>
                ) : null}
              </View>
            </Tap>
          </View>

          {!roasters.length && catalog.syncing ? <Skeleton rows={3} avatar /> : null}
          {!roasters.length && !catalog.syncing ? <EmptyState title={t('catalog.empty')} /> : null}

          {featured.length ? (
            <>
              <SectionTitle>{t('explore.featured')}</SectionTitle>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredRow}
              >
                {featured.map((r, i) => {
                  const st = roasterStats(catalog, r.id);
                  return (
                    <Animated.View
                      key={r.id}
                      entering={
                        reduce || i >= 8 ? undefined : FadeInDown.delay(i * 60).duration(260)
                      }
                    >
                      <Tap
                        accessibilityRole="button"
                        accessibilityLabel={r.name}
                        onPress={() => open(r.id)}
                        style={styles.featured}
                      >
                        <RoasterAvatar
                          name={r.name}
                          logoUrl={r.logoUrl}
                          color={r.brandColor}
                          size={44}
                        />
                        <View style={styles.featuredBody}>
                          <Text variant="bodyStrong" numberOfLines={1}>
                            {r.name}
                          </Text>
                          <Text variant="small" numberOfLines={1}>
                            {r.district ?? r.city}
                          </Text>
                          <Text variant="small">
                            {t('explore.counts', { e: st.espresso, f: st.filter })}
                          </Text>
                          {st.minPricePerKgKurus ? (
                            <Text variant="bodyStrong" color={c.primaryText}>
                              {t('explore.from', { price: formatTRY(st.minPricePerKgKurus) })}
                            </Text>
                          ) : null}
                        </View>
                      </Tap>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          {cheapest.length > 1 ? (
            <>
              <SectionTitle>{t('explore.cheapest')}</SectionTitle>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredRow}
              >
                {cheapest.slice(0, 8).map(({ p, r, tier }) => (
                  <Tap
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.name}, ${r.name}`}
                    onPress={() => nav.push({ pathname: '/product/[id]', params: { id: p.id } })}
                    style={styles.bean}
                  >
                    <Icon name="bean" size={20} color={c.primaryText} />
                    <Text variant="bodyStrong" numberOfLines={2}>
                      {p.name}
                    </Text>
                    <Text variant="small" numberOfLines={1}>
                      {r.name}
                    </Text>
                    {tier ? (
                      <Text variant="bodyStrong" color={c.primaryText}>
                        {formatTRY(tier.pricePerKgKurus)}/kg
                      </Text>
                    ) : null}
                  </Tap>
                ))}
              </ScrollView>
            </>
          ) : null}

          {roasters.length ? (
            <>
              <SectionTitle>{t('explore.map')}</SectionTitle>
              <Card style={styles.mapCard}>
                <TurkeyMap roasters={roasters} />
                <CityMap roasters={roasters} selectedId={selected} onSelect={setSelected} />
                {sel ? (
                  <Tap
                    accessibilityRole="button"
                    onPress={() => open(sel.id)}
                    style={styles.selRow}
                  >
                    <RoasterAvatar
                      name={sel.name}
                      logoUrl={sel.logoUrl}
                      color={sel.brandColor}
                      size={40}
                    />
                    <View style={styles.flex}>
                      <Text variant="bodyStrong">{sel.name}</Text>
                      <Text variant="small">
                        {[sel.district, sel.address].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Text variant="bodyStrong" color={c.primaryText}>
                      {t('explore.catalog')}
                    </Text>
                  </Tap>
                ) : (
                  <Text variant="small" style={styles.center}>
                    {t('explore.tapPin')}
                  </Text>
                )}
              </Card>

              <SectionTitle count={list.length}>{t('explore.byDistrict')}</SectionTitle>
              <Chips
                options={[
                  { value: 'all', label: t('catalog.all') },
                  ...districts.map((d) => ({ value: d, label: d })),
                ]}
                value={district}
                onChange={setDistrict}
              />
              <View style={styles.list}>
                {list.map((r) => {
                  const st = roasterStats(catalog, r.id);
                  return (
                    <Tap
                      key={r.id}
                      accessibilityRole="button"
                      accessibilityLabel={r.name}
                      onPress={() => open(r.id)}
                      style={styles.roasterRow}
                    >
                      <RoasterAvatar
                        name={r.name}
                        logoUrl={r.logoUrl}
                        color={r.brandColor}
                        size={52}
                      />
                      <View style={styles.flex}>
                        <Text variant="h3">{r.name}</Text>
                        <Text variant="small" numberOfLines={1}>
                          {[r.district ?? r.city, r.address?.split(',')[0]]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                        <Text variant="small">
                          {t('explore.counts', { e: st.espresso, f: st.filter })}
                        </Text>
                        <View style={styles.rowMeta}>
                          {st.minPricePerKgKurus ? (
                            <Text variant="bodyStrong" color={c.primaryText}>
                              {t('explore.from', { price: formatTRY(st.minPricePerKgKurus) })}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <Icon name="chevron" size={18} color={colors.textMuted} />
                    </Tap>
                  );
                })}
              </View>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  quick: { flexDirection: 'row', gap: space.md },
  quickSub: { opacity: 0.85, marginTop: 2 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 10,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: 12,
  },
  bean: {
    width: 150,
    padding: space.md,
    gap: 4,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  quickCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    minHeight: 96,
    justifyContent: 'space-between',
  },
  featuredRow: { gap: space.md, paddingRight: space.lg },
  featured: {
    width: 190,
    padding: space.md,
    gap: space.md,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  layer: { zIndex: 1 },
  featuredBody: { gap: 2 },
  mapCard: { gap: space.md, padding: space.md },
  selRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  list: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  roasterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexWrap: 'wrap',
    marginTop: 4,
  },
});
