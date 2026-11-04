import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '@/theme';

let uid = 0;

/** Soft radial "blob" (colour fades to transparent at the edge). */
export function Blob({
  size,
  color,
  opacity = 1,
  style,
}: {
  size: number;
  color: string;
  opacity?: number;
  style?: ViewStyle;
}) {
  const id = `blob${++uid}`;
  return (
    <View style={[{ position: 'absolute', width: size, height: size }, style]} pointerEvents="none">
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
            <Stop offset="60%" stopColor={color} stopOpacity={opacity * 0.55} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

function Floating({
  children,
  dx,
  dy,
  duration,
}: {
  children: React.ReactNode;
  dx: number;
  dy: number;
  duration: number;
}) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduce)
      t.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce, t, duration]);
  const s = useAnimatedStyle(() => ({
    transform: [{ translateX: dx * t.value }, { translateY: dy * t.value }],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, s]} pointerEvents="none">
      {children}
    </Animated.View>
  );
}

/** Warm sun → orange → coral blobs drifting slowly behind the content (static with reduce motion). */
export function BlobField() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Floating dx={18} dy={24} duration={7000}>
        <Blob size={340} color={colors.sun} opacity={0.32} style={{ top: -60, right: -140 }} />
      </Floating>
      <Floating dx={-22} dy={18} duration={9000}>
        <Blob size={300} color={colors.orange} opacity={0.22} style={{ top: 360, left: -160 }} />
      </Floating>
      <Floating dx={14} dy={-20} duration={8000}>
        <Blob size={280} color={colors.coral} opacity={0.16} style={{ top: 720, right: -120 }} />
      </Floating>
    </View>
  );
}

/** Two warm blobs inside the gradient header. */
export function HeaderBlobs() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Floating dx={-14} dy={10} duration={6000}>
        <Blob size={220} color={colors.sun} opacity={0.55} style={{ top: -110, right: -60 }} />
      </Floating>
      <Floating dx={12} dy={-6} duration={7500}>
        <Blob size={160} color={colors.orange} opacity={0.4} style={{ bottom: -90, left: 40 }} />
      </Floating>
    </View>
  );
}
