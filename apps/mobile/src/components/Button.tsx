import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
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
import { radius, type as typo, useColors, type ThemeColors } from '@/theme';
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

/** Press: scale 0.96, release: spring back (spec §11.4). */
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
  const scale = useSharedValue(1);
  const reduce = useReducedMotion();
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const v = variants(useColors())[variant];
  const isDisabled = disabled || loading;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      onPressIn={() => {
        scale.value = reduce ? 1 : withTiming(0.96, { duration: 80 });
      }}
      onPressOut={() => {
        scale.value = reduce ? 1 : withSpring(1, { damping: 12, stiffness: 300 });
      }}
      onPress={() => {
        if (variant === 'primary') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={[
        styles.base,
        small && styles.small,
        { backgroundColor: v.bg, borderColor: v.border },
        isDisabled && styles.disabled,
        anim,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={small ? 18 : 20} color={v.fg} /> : null}
          <Text style={[typo.button, { color: v.fg }, small && { fontSize: 14 }]}>{title}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

function variants(c: ThemeColors): Record<Variant, { bg: string; fg: string; border: string }> {
  return {
    primary: { bg: c.primary, fg: c.onPrimary, border: c.primary },
    secondary: { bg: c.bg, fg: c.primaryText, border: c.primaryText },
    ghost: { bg: 'transparent', fg: c.primaryText, border: 'transparent' },
    danger: { bg: c.bg, fg: c.danger, border: c.danger },
  };
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { minHeight: 44, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disabled: { opacity: 0.5 },
});
