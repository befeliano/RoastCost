import * as Haptics from 'expo-haptics';
import { useEffect, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, space } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK_LEN = 48;
const CONFETTI = ['#12874A', '#38A8E0', '#C9A227', '#D92D20', '#7A4B2A'];

function Particle({ i, reduce }: { i: number; reduce: boolean }) {
  const p = useSharedValue(0);
  const cfg = useMemo(() => {
    const angle = (Math.PI * 2 * i) / 14 + (i % 3) * 0.2;
    const dist = 90 + (i % 4) * 22;
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - 30,
      rot: (i % 2 ? 1 : -1) * (180 + i * 20),
      color: CONFETTI[i % CONFETTI.length],
    };
  }, [i]);
  useEffect(() => {
    if (!reduce)
      p.value = withDelay(120, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [p, reduce]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value === 0 ? 0 : 1 - p.value,
    transform: [
      { translateX: cfg.dx * p.value },
      { translateY: cfg.dy * p.value + 60 * p.value * p.value },
      { rotate: `${cfg.rot * p.value}deg` },
    ],
  }));
  return <Animated.View style={[styles.particle, { backgroundColor: cfg.color }, style]} />;
}

/** Success pop-up: the check mark draws itself, own confetti particles, success haptic (spec §11.4). */
export function SuccessOverlay({
  visible,
  title,
  body,
  onClose,
}: {
  visible: boolean;
  title: string;
  body?: string;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(0.6);
  const draw = useSharedValue(0);
  useEffect(() => {
    if (!visible) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = reduce ? 1 : withSpring(1, { damping: 9, stiffness: 180 });
    draw.value = reduce
      ? 1
      : withDelay(150, withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) }));
    return () => {
      scale.value = 0.6;
      draw.value = 0;
    };
  }, [visible, reduce, scale, draw]);
  const badge = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LEN * (1 - draw.value) }));
  if (!visible) return null;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Kapat"
      >
        <View style={styles.card} accessibilityRole="alert">
          <View style={styles.burst}>
            {Array.from({ length: 14 }, (_, i) => (
              <Particle key={i} i={i} reduce={reduce} />
            ))}
            <Animated.View style={badge}>
              <Svg width={96} height={96} viewBox="0 0 96 96">
                <Circle cx="48" cy="48" r="44" fill={colors.success} />
                <AnimatedPath
                  d="M30 50 L43 63 L67 36"
                  stroke="#fff"
                  strokeWidth={7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray={CHECK_LEN}
                  animatedProps={checkProps}
                />
              </Svg>
            </Animated.View>
          </View>
          <Text variant="h2" style={styles.center}>
            {title}
          </Text>
          {body ? (
            <Text variant="small" style={styles.center}>
              {body}
            </Text>
          ) : null}
          <Button title="Tamam" onPress={onClose} style={styles.btn} />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(43,31,26,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  card: {
    backgroundColor: colors.bg,
    borderRadius: 24,
    padding: space.xl,
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    maxWidth: 360,
  },
  burst: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute', width: 8, height: 12, borderRadius: 2 },
  center: { textAlign: 'center' },
  btn: { alignSelf: 'stretch', marginTop: space.sm },
});
