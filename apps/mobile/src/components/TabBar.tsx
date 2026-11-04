import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { fonts, useColors, type ThemeColors } from '@/theme';
import { Icon, type IconName } from './Icon';

/** Active tab: accent pill springs in behind the icon. */
function TabIcon({ name, focused, c }: { name: IconName; focused: boolean; c: ThemeColors }) {
  const reduce = useReducedMotion();
  const v = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    v.value = reduce
      ? focused
        ? 1
        : 0
      : focused
        ? withSpring(1, { damping: 12, stiffness: 260 })
        : withTiming(0, { duration: 150 });
  }, [focused, reduce, v]);
  const pill = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ scaleX: 0.6 + v.value * 0.4 }],
  }));
  const icon = useAnimatedStyle(() => ({
    transform: [{ translateY: -v.value * 1 }, { scale: 1 + v.value * 0.06 }],
  }));
  return (
    <View style={styles.iconWrap}>
      <Animated.View style={[styles.pill, { backgroundColor: c.accent }, pill]} />
      <Animated.View style={icon}>
        <Icon
          name={name}
          size={23}
          color={focused ? c.onAccent : c.textMuted}
          strokeWidth={focused ? 2.2 : 1.8}
        />
      </Animated.View>
    </View>
  );
}

/** Frosted-glass floating tab bar (content scrolls underneath; Screen pads for it). */
export function useTabOptions() {
  const c = useColors();
  return {
    screenOptions: {
      headerShown: false,
      tabBarActiveTintColor: c.primaryText,
      tabBarInactiveTintColor: c.textMuted,
      tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, marginTop: 2 },
      tabBarStyle: {
        position: 'absolute' as const,
        borderTopWidth: 0,
        backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.96)' : 'transparent',
        elevation: 0,
        height: Platform.OS === 'ios' ? 88 : 72,
        paddingTop: 8,
      },
      tabBarBackground: () => (
        <View style={StyleSheet.absoluteFill}>
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.glassEdge]} />
        </View>
      ),
    },
    tab: (title: string, icon: IconName) => ({
      title,
      tabBarIcon: ({ focused }: { focused: boolean }) => (
        <TabIcon name={icon} focused={focused} c={c} />
      ),
      tabBarAccessibilityLabel: title,
    }),
  };
}

const styles = StyleSheet.create({
  iconWrap: { width: 56, height: 32, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', width: 56, height: 32, borderRadius: 16 },
  glassEdge: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(22,51,0,0.12)',
  },
});
