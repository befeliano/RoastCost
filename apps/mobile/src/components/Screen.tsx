import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
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

/** Accent-coloured top bar (spec K14; colour chosen in Ayarlar → Görünüm) + content. */
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
  const c = useColors();
  return (
    <View style={styles.root}>
      <StatusBar style={c.onPrimary === '#FFFFFF' ? 'light' : 'dark'} />
      <View style={[styles.bar, { paddingTop: insets.top + 6, backgroundColor: c.primary }]}>
        <View style={styles.barRow}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Geri"
              hitSlop={hitSlop}
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Icon name="back" color={c.onPrimary} />
            </Pressable>
          ) : null}
          <View style={styles.title}>
            <Text variant="h2" color={c.onPrimary} numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="small" color={c.onPrimary} numberOfLines={1} style={styles.subtitle}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right}
        </View>
      </View>
      {showOffline ? <OfflineBanner /> : null}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: space.xxl + (footer ? 0 : insets.bottom) },
            ]}
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
          <View style={[styles.flex, styles.content]}>{children}</View>
        )}
        {footer ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>{footer}</View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  bar: { paddingHorizontal: space.lg, paddingBottom: space.md },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40 },
  backBtn: { width: 36, height: 40, justifyContent: 'center' },
  title: { flex: 1 },
  subtitle: { opacity: 0.9 },
  content: { padding: space.lg, gap: space.md },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    gap: space.sm,
  },
});
