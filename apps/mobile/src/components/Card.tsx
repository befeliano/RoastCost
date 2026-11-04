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
import { colors, radius, space } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Rounded card with a soft shadow; pressable cards squish slightly (0.98) and spring back. */
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
    borderRadius: radius.lg + 4,
    padding: space.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#163300',
        shadowOpacity: 0.08,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 2 },
      default: { boxShadow: '0 8px 24px rgba(22,51,0,0.08)' },
    }),
  },
});
