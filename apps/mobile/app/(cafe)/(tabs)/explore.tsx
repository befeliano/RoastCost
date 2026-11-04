import { formatTRY } from '@roastcost/shared';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Chips, EmptyState, SectionTitle } from '@/components/Misc';
import { RoasterAvatar } from '@/components/RoasterAvatar';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { EmailVerifyNotice, StatusCard } from '@/features/account/StatusCards';
import { Freshness } from '@/features/catalog/Freshness';
import { districtsOf, roasterStats } from '@/features/catalog/stats';
import { activeRoasters, useCatalog } from '@/features/catalog/store';
import { CityMap, TurkeyMap } from '@/features/explore/Maps';
import { t } from '@/locales';
import { useSession } from '@/store/session';
import { colors, radius, space, useColors } from '@/theme';

export default function Explore() {
  const me = useSession((s) => s.me);
  const catalog = useCatalog();
  const c = useColors();
  const reduce = useReducedMotion();
  const [district, setDistrict] = useState<string>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const roasters = useMemo(() => activeRoasters(catalog), [catalog]);
  const featured = roasters.filter((r) => r.isFeatured).length
    ? roasters.filter((r) => r.isFeatured)
    : roasters.slice(0, 5);
  const districts = districtsOf(roasters);
  const list = district === 'all' ? roasters : roasters.filter((r) => r.district === district);
  const sel = selected ? catalog.roasters[selected] : undefined;
  const open = (id: string) => router.push({ pathname: '/roaster/[id]', params: { id } });
  const cafe = me?.cafe;

  if (cafe && cafe.status !== 'approved') {
    return (
      <Screen title={t('explore.title')} subtitle={t('explore.hello', { name: cafe.name })}>
        <StatusCard status={cafe.status} note={cafe.statusNote} />
        {me && !me.user.emailVerified ? <EmailVerifyNotice email={me.user.email} /> : null}
        <EmptyState title={t('explore.pendingTitle')} body={t('explore.pendingBody')} />
        <Button title={t('explore.calc')} icon="cup" onPress={() => router.push('/cost')} />
      </Screen>
    );
  }

  return (
    <Screen
      title={t('explore.title')}
      subtitle={cafe ? t('explore.hello', { name: cafe.name }) : undefined}
      onRefresh={() => void catalog.sync({ force: true })}
      refreshing={catalog.syncing}
    >
      {me && !me.user.emailVerified ? <EmailVerifyNotice email={me.user.email} /> : null}

      <View style={styles.quick}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/cost')}
          style={[styles.quickCard, { backgroundColor: c.primary }]}
        >
          <Icon name="cup" color={c.onPrimary} size={28} />
          <Text variant="bodyStrong" color={c.onPrimary}>
            {t('explore.calc')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/compare')}
          style={[styles.quickCard, { backgroundColor: c.primaryBg }]}
        >
          <Icon name="chart" color={c.primaryText} size={28} />
          <Text variant="bodyStrong" color={c.primaryText}>
            {t('explore.compare')}
          </Text>
        </Pressable>
      </View>

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
                  entering={reduce || i >= 8 ? undefined : FadeInDown.delay(i * 60).duration(260)}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={r.name}
                    onPress={() => open(r.id)}
                    style={styles.featured}
                  >
                    <View
                      style={[styles.featuredBand, { backgroundColor: r.brandColor ?? c.primary }]}
                    >
                      <RoasterAvatar
                        name={r.name}
                        logoUrl={r.logoUrl}
                        color={r.brandColor}
                        size={56}
                      />
                    </View>
                    <View style={styles.featuredBody}>
                      <Text variant="h3" numberOfLines={1}>
                        {r.name}
                      </Text>
                      <Text variant="small" numberOfLines={1}>
                        {r.district ?? r.city}
                      </Text>
                      <Text variant="small" numberOfLines={1}>
                        {t('explore.counts', { e: st.espresso, f: st.filter })}
                      </Text>
                      {st.minPricePerKgKurus ? (
                        <Text variant="bodyStrong" color={c.primaryText}>
                          {t('explore.from', { price: formatTRY(st.minPricePerKgKurus) })}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
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
              <Pressable
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
              </Pressable>
            ) : (
              <Text variant="small" style={styles.center}>
                {t('explore.tapPin')}
              </Text>
            )}
          </Card>

          <SectionTitle>{t('explore.byDistrict')}</SectionTitle>
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
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityLabel={r.name}
                  onPress={() => open(r.id)}
                  style={({ pressed }) => [
                    styles.roasterRow,
                    pressed && { backgroundColor: c.primaryBg },
                  ]}
                >
                  <RoasterAvatar name={r.name} logoUrl={r.logoUrl} color={r.brandColor} size={52} />
                  <View style={styles.flex}>
                    <Text variant="h3">{r.name}</Text>
                    <Text variant="small">
                      {r.district ?? r.city} ·{' '}
                      {t('explore.counts', { e: st.espresso, f: st.filter })}
                    </Text>
                    <View style={styles.rowMeta}>
                      {st.minPricePerKgKurus ? (
                        <Text variant="bodyStrong" color={c.primaryText}>
                          {t('explore.from', { price: formatTRY(st.minPricePerKgKurus) })}
                        </Text>
                      ) : null}
                      <Freshness iso={r.pricesUpdatedAt} />
                    </View>
                  </View>
                  <Icon name="chevron" size={18} color={colors.textMuted} />
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  quick: { flexDirection: 'row', gap: space.md },
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
    width: 200,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuredBand: { height: 72, justifyContent: 'flex-end', padding: space.md, paddingBottom: 0 },
  featuredBody: { padding: space.md, paddingTop: space.lg, gap: 2 },
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
