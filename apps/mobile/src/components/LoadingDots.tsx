import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

function Dot({ v, color }: { v: SharedValue<number>; color: string }) {
  const s = useAnimatedStyle(() => ({
    opacity: 0.35 + v.value * 0.65,
    transform: [{ translateY: -v.value * 2 }],
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, s]} />;
}

/** Three quiet dots instead of a spinner while a button's action runs. */
export function LoadingDots({ color }: { color: string }) {
  const reduce = useReducedMotion();
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const c = useSharedValue(0);
  useEffect(() => {
    if (reduce) {
      a.value = b.value = c.value = 0.6;
      return;
    }
    const pulse = () =>
      withRepeat(
        withSequence(withTiming(1, { duration: 280 }), withTiming(0, { duration: 280 })),
        -1,
      );
    a.value = pulse();
    b.value = withDelay(140, pulse());
    c.value = withDelay(280, pulse());
  }, [reduce, a, b, c]);
  return (
    <View style={styles.row} accessibilityLabel="İşleniyor">
      <Dot v={a} color={color} />
      <Dot v={b} color={color} />
      <Dot v={c} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 20 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
