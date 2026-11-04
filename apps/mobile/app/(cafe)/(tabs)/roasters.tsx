import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { StatusCard } from '@/features/account/StatusCards';
import { Freshness } from '@/features/catalog/Freshness';
import { activeRoasters, productsOf, useCatalog } from '@/features/catalog/store';
import { t } from '@/locales';
import { useSession } from '@/store/session';
import { space } from '@/theme';

export default function Roasters() {
  const cafe = useSession((s) => s.me?.cafe);
  const catalog = useCatalog();
  if (cafe && cafe.status !== 'approved') {
    return (
      <Screen title={t('catalog.title')}>
        <StatusCard status={cafe.status} note={cafe.statusNote} />
      </Screen>
    );
  }
  const roasters = activeRoasters(catalog);
  return (
    <Screen
      title={t('catalog.title')}
      onRefresh={() => void catalog.sync({ force: true })}
      refreshing={catalog.syncing}
    >
      {roasters.length ? (
        <Button
          title={t('catalog.compare')}
          icon="chart"
          variant="secondary"
          onPress={() => router.push('/compare')}
        />
      ) : null}
      {!roasters.length && !catalog.syncing ? <EmptyState title={t('catalog.empty')} /> : null}
      {roasters.map((r) => (
        <Card
          key={r.id}
          onPress={() => router.push({ pathname: '/roaster/[id]', params: { id: r.id } })}
          style={styles.card}
          accessibilityLabel={r.name}
        >
          <Text variant="h3">{r.name}</Text>
          <Text variant="small">
            {r.city} · {productsOf(catalog, r.id).length} ürün ·{' '}
            {r.pricesIncludeVat ? t('catalog.vatIncluded') : t('catalog.vatExcluded')}
          </Text>
          <View>
            <Freshness iso={r.pricesUpdatedAt} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ card: { gap: space.xs } });
