import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { t } from '@/locales';
import { colors } from '@/theme';

const LEVEL = { light: 1, medium: 2, dark: 3 } as const;

/** Roast level as three dots + label (açık / orta / koyu). */
export function RoastDots({ level }: { level: 'light' | 'medium' | 'dark' | null }) {
  if (!level) return null;
  const n = LEVEL[level];
  return (
    <View style={styles.row} accessibilityLabel={t(`catalog.roast.${level}`)}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[styles.dot, { backgroundColor: i <= n ? colors.coffee : colors.border }]}
        />
      ))}
      <Text variant="caption">{t(`catalog.roast.${level}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
