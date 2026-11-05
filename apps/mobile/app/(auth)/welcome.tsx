import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
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
import { Icon } from '@/components/Icon';
import { nav } from '@/lib/nav';
import { Tap } from '@/components/Tap';

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

/** Set EXPO_PUBLIC_SUPPORT_EMAIL; the roaster link stays hidden until a real address exists. */
const ROASTER_CONTACT = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

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
        <View style={styles.points}>
          {(
            [
              ['calc', t('auth.point1')],
              ['chart', t('auth.point2')],
              ['send', t('auth.point3')],
            ] as const
          ).map(([icon, text], i) => (
            <Animated.View
              key={icon}
              entering={FadeInDown.delay(150 + i * 90).duration(300)}
              style={styles.point}
            >
              <View style={[styles.pointIcon, { backgroundColor: c.primaryBg }]}>
                <Icon name={icon} size={18} color={c.primaryText} />
              </View>
              <Text variant="body" style={styles.flex}>
                {text}
              </Text>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
      <View style={styles.actions}>
        <Button title={t('auth.register')} onPress={() => nav.push('/register')} />
        <Button title={t('auth.login')} variant="secondary" onPress={() => nav.push('/login')} />
        {ROASTER_CONTACT ? (
          <Tap
            accessibilityRole="link"
            onPress={() =>
              void Linking.openURL(
                `mailto:${ROASTER_CONTACT}?subject=${encodeURIComponent('RoastCost — kavurucu başvurusu')}`,
              )
            }
            style={styles.roasterLink}
          >
            <Text variant="small" color={c.primaryText}>
              {t('auth.areYouRoaster')}
            </Text>
          </Tap>
        ) : null}
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
  flex: { flex: 1 },
  points: { gap: space.md, alignSelf: 'stretch', marginTop: space.sm },
  point: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pointIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roasterLink: { alignItems: 'center', paddingVertical: space.sm },
});
