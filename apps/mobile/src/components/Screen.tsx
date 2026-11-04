import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { useContext, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, hitSlop, space, useColors } from '@/theme';
import { Icon } from './Icon';
import { OfflineBanner } from './OfflineBanner';
import { Text } from './Text';

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  footer?: ReactNode;
  showOffline?: boolean;
}

/**
 * Gradient hero header with warm blobs and rounded bottom corners (safe-area aware), drifting blob
 * background, content padded above the floating tab bar when inside tabs.
 */
export function Screen({
  title,
  subtitle,
  back,
  right,
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
  footer,
  showOffline = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const tabBar = useContext(BottomTabBarHeightContext) ?? 0;
  const c = useColors();
  const bottomPad = footer ? space.lg : Math.max(tabBar, insets.bottom) + space.xxl;
  return (
    <View style={styles.root}>
      <StatusBar style={c.onPrimary === '#FFFFFF' ? 'light' : 'dark'} />
      <LinearGradient
        colors={c.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.4 }}
        style={[styles.bar, { paddingTop: insets.top + space.xs }]}
      >
        <View style={styles.barRow}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Geri"
              hitSlop={hitSlop}
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Icon name="back" color={c.onPrimary} size={22} />
            </Pressable>
          ) : null}
          <Animated.View entering={FadeIn.duration(250)} style={styles.title}>
            <Text variant="h2" color={c.onPrimary} numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="small" color={c.onPrimary} numberOfLines={1} style={styles.subtitle}>
                {subtitle}
              </Text>
            ) : null}
          </Animated.View>
          {right}
        </View>
      </LinearGradient>
      {showOffline ? <OfflineBanner /> : null}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={c.primaryText}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.content, { paddingBottom: bottomPad }]}>
            {children}
          </View>
        )}
        {footer ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
            <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  bar: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    overflow: 'hidden',
    zIndex: 2,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 38 },
  backBtn: {
    width: 30,
    height: 34,
    marginLeft: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
  // own layer: on web, absolutely positioned siblings (blur) would paint over a bare <svg>
  layer: { zIndex: 1 },
  subtitle: { opacity: 0.9, marginTop: 1 },
  content: { padding: space.lg, gap: space.md },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.72)',
    overflow: 'hidden',
  },
});
