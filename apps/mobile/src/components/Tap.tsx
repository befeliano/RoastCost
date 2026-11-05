import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable with visible feedback: squishes slightly and dims while pressed, springs back on release.
 * Use instead of a bare Pressable for anything tappable. Reduce motion → opacity only.
 */
export function Tap({
  style,
  onPressIn,
  onPressOut,
  scaleTo = 0.96,
  ...rest
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const reduce = useReducedMotion();
  const s = useSharedValue(1);
  const o = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: o.value }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        if (!reduce) s.value = withTiming(scaleTo, { duration: 80 });
        o.value = withTiming(0.75, { duration: 80 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = reduce ? 1 : withSpring(1, { damping: 12, stiffness: 320, mass: 0.6 });
        o.value = withTiming(1, { duration: 140 });
        onPressOut?.(e);
      }}
      style={[style, anim]}
    />
  );
}
