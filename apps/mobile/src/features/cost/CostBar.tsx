import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { space, useColors } from '@/theme';

/** Where a cup's cost goes — one stacked bar + legend (coffee / ingredients / cup / overhead). */
export function CostBar({ parts }: { parts: { label: string; value: number }[] }) {
  const c = useColors();
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (!total) return null;
  const tones = [c.primary, c.accent, '#C9B8A6', '#8C7B6B'];
  const shown = parts
    .map((p, i) => ({ ...p, color: tones[i % tones.length] as string }))
    .filter((p) => p.value > 0);
  return (
    <View
      style={styles.wrap}
      accessibilityLabel={shown
        .map((p) => `${p.label} %${Math.round((p.value / total) * 100)}`)
        .join(', ')}
    >
      <View style={styles.bar}>
        {shown.map((p) => (
          <View key={p.label} style={{ flex: p.value, backgroundColor: p.color }} />
        ))}
      </View>
      <View style={styles.legend}>
        {shown.map((p) => (
          <View key={p.label} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: p.color }]} />
            <Text variant="caption">
              {p.label} %{Math.round((p.value / total) * 100)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, marginBottom: space.xs },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, rowGap: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
