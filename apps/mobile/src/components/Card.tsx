import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, space } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Card with a hairline border and a faint shadow; pressable cards squish slightly (0.98) and spring back. */
export function Card({
  style,
  onPress,
  children,
  ...rest
}: ViewProps & { onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const scale = useSharedValue(1);
  const reduce = useReducedMotion();
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  if (onPress) {
    return (
      <AnimatedPressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={() => {
          if (!reduce) scale.value = withTiming(0.98, { duration: 90 });
        }}
        onPressOut={() => {
          scale.value = reduce ? 1 : withSpring(1, { damping: 12, stiffness: 300 });
        }}
        style={[styles.card, anim, style]}
        {...rest}
      >
        {children}
      </AnimatedPressable>
    );
  }
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#3B2416',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
      default: { boxShadow: '0 2px 6px rgba(59,36,22,0.04)' },
    }),
  },
});
