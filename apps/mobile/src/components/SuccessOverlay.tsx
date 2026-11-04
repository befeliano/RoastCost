import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, space } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const SIZE = 132;
const R = 54;
const RING = 2 * Math.PI * R;
const CHECK = 64;
const GREEN = '#22B05E';

function haptic() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/**
 * Apple-Pay-like confirmation: frosted-glass backdrop → the ring draws itself → it fills with a pop
 * → the check mark draws → success haptic + a soft glow pulse. With `autoHideMs` it dismisses itself
 * (e.g. "Sepete eklendi"); without it a "Tamam" button is shown. Reduce motion → instant.
 */
export function SuccessOverlay({
  visible,
  title,
  body,
  onClose,
  autoHideMs,
}: {
  visible: boolean;
  title: string;
  body?: string;
  onClose: () => void;
  autoHideMs?: number;
}) {
  const reduce = useReducedMotion();
  const backdrop = useSharedValue(0);
  const ring = useSharedValue(0);
  const fill = useSharedValue(0);
  const check = useSharedValue(0);
  const glow = useSharedValue(0);
  const text = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    if (reduce) {
      backdrop.value = 1;
      ring.value = 1;
      fill.value = 1;
      check.value = 1;
      text.value = 1;
      haptic();
    } else {
      backdrop.value = withTiming(1, { duration: 220 });
      ring.value = withDelay(
        80,
        withTiming(1, { duration: 520, easing: Easing.inOut(Easing.cubic) }),
      );
      fill.value = withDelay(560, withSpring(1, { damping: 9, stiffness: 220, mass: 0.7 }));
      check.value = withDelay(
        700,
        withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }, (done) => {
          if (done) runOnJS(haptic)();
        }),
      );
      glow.value = withDelay(
        820,
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) }),
        ),
      );
      text.value = withDelay(760, withTiming(1, { duration: 300 }));
    }
    const timer = autoHideMs ? setTimeout(onClose, autoHideMs + (reduce ? 0 : 900)) : undefined;
    return () => {
      if (timer) clearTimeout(timer);
      backdrop.value = 0;
      ring.value = 0;
      fill.value = 0;
      check.value = 0;
      glow.value = 0;
      text.value = 0;
    };
  }, [visible, reduce, autoHideMs, onClose, backdrop, ring, fill, check, glow, text]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING * (1 - ring.value) }));
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fill.value }],
    opacity: fill.value > 0.01 ? 1 : 0,
  }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK * (1 - check.value) }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.45,
    transform: [{ scale: 1 + (1 - glow.value) * 0.6 }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: text.value,
    transform: [{ translateY: (1 - text.value) * 12 }],
  }));

  if (!visible) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.tint]} />
      </Animated.View>
      <Pressable
        style={styles.center}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Kapat"
      >
        <View
          style={styles.card}
          accessibilityRole="alert"
          accessibilityLabel={`${title}${body ? '. ' + body : ''}`}
        >
          <View style={styles.badge}>
            <Animated.View style={[styles.glow, glowStyle]} />
            <Animated.View style={[styles.fill, fillStyle]} />
            <Svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              style={StyleSheet.absoluteFill}
            >
              <AnimatedCircle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                stroke={GREEN}
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={RING}
                animatedProps={ringProps}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
              <AnimatedPath
                d="M42 68 L59 85 L92 50"
                stroke="#FFFFFF"
                strokeWidth={9}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={CHECK}
                animatedProps={checkProps}
              />
            </Svg>
          </View>
          <Animated.View style={[styles.texts, textStyle]}>
            <Text variant="h2" style={styles.centerText}>
              {title}
            </Text>
            {body ? (
              <Text variant="body" color={colors.textMuted} style={styles.centerText}>
                {body}
              </Text>
            ) : null}
            {!autoHideMs ? <Button title="Tamam" onPress={onClose} style={styles.btn} /> : null}
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tint: { backgroundColor: 'rgba(255,255,255,0.25)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: space.lg,
    paddingVertical: space.xxl,
    paddingHorizontal: space.xl,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  badge: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  fill: {
    position: 'absolute',
    width: R * 2 + 6,
    height: R * 2 + 6,
    borderRadius: R + 3,
    backgroundColor: GREEN,
  },
  glow: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: GREEN,
  },
  texts: { alignItems: 'center', gap: space.xs, alignSelf: 'stretch' },
  centerText: { textAlign: 'center' },
  btn: { alignSelf: 'stretch', marginTop: space.md },
});
