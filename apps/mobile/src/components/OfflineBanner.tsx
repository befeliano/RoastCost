import { useNetworkState } from 'expo-network';
import { StyleSheet, View } from 'react-native';
import { useCatalog } from '@/features/catalog/store';
import { formatRelative } from '@/lib/format';
import { t } from '@/locales';
import { colors, space } from '@/theme';
import { Text } from './Text';

/** Thin banner with the last sync time when offline (spec §10.4). */
export function OfflineBanner() {
  const net = useNetworkState();
  const syncedAt = useCatalog((s) => s.syncedAt);
  if (net.isConnected !== false && net.isInternetReachable !== false) return null;
  return (
    <View style={styles.bar} accessibilityRole="alert">
      <Text variant="caption" color={colors.onPrimary}>
        {t('common.offline')} ·{' '}
        {t('common.lastSync', { time: syncedAt ? formatRelative(syncedAt) : t('common.never') })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.coffee, paddingVertical: 6, paddingHorizontal: space.lg },
});
