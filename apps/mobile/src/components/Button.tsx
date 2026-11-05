import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { type as typo, useColors } from '@/theme';
import { Icon, type IconName } from './Icon';
import { LoadingDots } from './LoadingDots';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  title: string;
  /** May return a promise: the button then locks (and shows dots) until it settles — no double submits. */
  onPress?: () => unknown;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Press: squish to 0.95 + fade to 0.85; release: springs back (spec §11.4).
 * Primary = solid palette colour (no gradient / glow — keeps it calm).
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  small,
  style,
  accessibilityHint,
}: Props) {
  const c = useColors();
  const scale = useSharedValue(1);
  const fade = useSharedValue(1);
  const reduce = useReducedMotion();
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: fade.value,
  }));
  const lock = useRef(0);
  const [running, setRunning] = useState(false);
  const busy = loading || running;
  const isDisabled = disabled || busy;
  const fire = () => {
    // ignore a second tap while the first is still running, or within 500 ms of it
    const now = Date.now();
    if (lock.current === -1 || now - lock.current < 500) return;
    lock.current = now;
    const r = onPress?.();
    if (r && typeof (r as Promise<unknown>).finally === 'function') {
      lock.current = -1;
      setRunning(true);
      void (r as Promise<unknown>).finally(() => {
        lock.current = Date.now();
        setRunning(false);
      });
    }
  };
  const fg = variant === 'primary' ? c.onPrimary : variant === 'danger' ? c.danger : c.primaryText;
  const border =
    variant === 'secondary' ? c.primaryText : variant === 'danger' ? c.danger : 'transparent';
  const bg = variant === 'secondary' || variant === 'danger' ? c.bg : 'transparent';
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: !!busy }}
      disabled={isDisabled}
      onPressIn={() => {
        if (reduce) return;
        scale.value = withTiming(0.95, { duration: 90 });
        fade.value = withTiming(0.85, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = reduce ? 1 : withSpring(1, { damping: 10, stiffness: 320, mass: 0.6 });
        fade.value = withTiming(1, { duration: 140 });
      }}
      onPress={() => {
        void Haptics.impactAsync(
          variant === 'primary'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        );
        fire();
      }}
      style={[
        styles.base,
        small && styles.small,
        { backgroundColor: bg, borderColor: border },
        variant === 'primary' && { backgroundColor: c.primary, borderColor: c.primary },
        disabled && styles.disabled,
        anim,
        style,
      ]}
    >
      {busy ? (
        <LoadingDots color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={small ? 18 : 20} color={fg} /> : null}
          <Text style={[typo.button, { color: fg }, small && { fontSize: 14 }]}>{title}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { minHeight: 44, borderRadius: 12, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disabled: { opacity: 0.45 },
});
