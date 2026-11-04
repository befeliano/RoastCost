import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { type as typo, useColors } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  title: string;
  onPress?: () => void;
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
 * Primary = palette gradient with a coloured glow.
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
  const isDisabled = disabled || loading;
  const fg = variant === 'primary' ? c.onPrimary : variant === 'danger' ? c.danger : c.primaryText;
  const border =
    variant === 'secondary' ? c.primaryText : variant === 'danger' ? c.danger : 'transparent';
  const bg = variant === 'secondary' || variant === 'danger' ? c.bg : 'transparent';
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
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
        onPress?.();
      }}
      style={[
        styles.base,
        small && styles.small,
        { backgroundColor: bg, borderColor: border },
        variant === 'primary' &&
          !isDisabled &&
          Platform.select({
            ios: {
              shadowColor: c.primary,
              shadowOpacity: 0.35,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
            },
            default: { elevation: 4 },
          }),
        isDisabled && styles.disabled,
        anim,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={c.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={fg} />
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
    minHeight: 56,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { minHeight: 44, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disabled: { opacity: 0.45 },
});
