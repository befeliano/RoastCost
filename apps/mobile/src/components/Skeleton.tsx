import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, space } from '@/theme';

function Bar({ w = '100%', h = 14, r = 6 }: { w?: DimensionValue; h?: number; r?: number }) {
  return <View style={{ width: w, height: h, borderRadius: r, backgroundColor: colors.border }} />;
}

/** Placeholder cards that gently pulse while data loads (instead of a bare "Yükleniyor…"). */
export function Skeleton({ rows = 3, avatar = false }: { rows?: number; avatar?: boolean }) {
  const reduce = useReducedMotion();
  const v = useSharedValue(0.55);
  useEffect(() => {
    if (!reduce) v.value = withRepeat(withTiming(1, { duration: 750 }), -1, true);
  }, [reduce, v]);
  const pulse = useAnimatedStyle(() => ({ opacity: v.value }));
  return (
    <Animated.View
      style={[styles.wrap, pulse]}
      accessibilityLabel="Yükleniyor"
      accessibilityRole="progressbar"
    >
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.card}>
          {avatar ? <Bar w={44} h={44} r={12} /> : null}
          <View style={styles.lines}>
            <Bar w="60%" h={16} />
            <Bar w="85%" />
            <Bar w="40%" />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  card: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  lines: { flex: 1, gap: 8 },
});
