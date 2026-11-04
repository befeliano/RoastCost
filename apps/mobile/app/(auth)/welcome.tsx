import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { APP_NAME } from '@roastcost/shared';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { t } from '@/locales';
import { colors, space, useColors } from '@/theme';

/** Our own mascot-free cup illustration with gentle steam (no third-party character). */
function Hero() {
  const reduce = useReducedMotion();
  const c = useColors();
  const steam = useSharedValue(0);
  useEffect(() => {
    if (!reduce)
      steam.value = withRepeat(
        withSequence(withTiming(1, { duration: 1400 }), withTiming(0, { duration: 1400 })),
        -1,
      );
  }, [reduce, steam]);
  const s = useAnimatedStyle(() => ({
    opacity: 0.4 + steam.value * 0.6,
    transform: [{ translateY: -steam.value * 6 }],
  }));
  return (
    <View style={styles.hero}>
      <Animated.View style={[styles.steam, s]}>
        <Svg width={80} height={40} viewBox="0 0 80 40">
          <Path
            d="M24 36c0-10 10-10 10-20S24 6 24 2M44 36c0-10 10-10 10-20S44 6 44 2"
            stroke={colors.border}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
      <Svg width={180} height={130} viewBox="0 0 180 130">
        <Ellipse cx="88" cy="120" rx="70" ry="8" fill={colors.surface} />
        <Path d="M30 20h110v34c0 32-24 56-55 56S30 86 30 54V20Z" fill={c.primary} />
        <Path
          d="M140 30h10a18 18 0 0 1 0 36h-12"
          fill="none"
          stroke={c.primary}
          strokeWidth={8}
          strokeLinecap="round"
        />
        <Ellipse cx="85" cy="20" rx="55" ry="8" fill={colors.coffee} />
      </Svg>
    </View>
  );
}

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.lg },
      ]}
    >
      <StatusBar style="dark" />
      <Animated.View entering={FadeInDown.duration(400)} style={styles.top}>
        <Text variant="h1" color={c.primaryText} style={styles.brand}>
          {APP_NAME}
        </Text>
        <Hero />
        <Text variant="h2" style={styles.center}>
          {t('auth.welcomeTitle')}
        </Text>
        <Text variant="body" color={colors.textMuted} style={styles.center}>
          {t('auth.welcomeBody')}
        </Text>
      </Animated.View>
      <View style={styles.actions}>
        <Button title={t('auth.register')} onPress={() => router.push('/register')} />
        <Button title={t('auth.login')} variant="secondary" onPress={() => router.push('/login')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.xl,
    justifyContent: 'space-between',
  },
  top: { alignItems: 'center', gap: space.lg },
  brand: { fontSize: 34, lineHeight: 40 },
  hero: { alignItems: 'center', marginVertical: space.lg },
  steam: { marginBottom: -6 },
  center: { textAlign: 'center' },
  actions: { gap: space.md },
});
