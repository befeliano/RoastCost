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
import { colors, hitSlop, space } from '@/theme';
import { Icon } from './Icon';
import { OfflineBanner } from './OfflineBanner';
import { Text } from './Text';

interface Props {
  title: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  footer?: ReactNode;
  showOffline?: boolean;
}

/** Bordo top bar (spec K14) + content. */
export function Screen({
  title,
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
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <View style={styles.barRow}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Geri"
              hitSlop={hitSlop}
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Icon name="back" color={colors.onPrimary} />
            </Pressable>
          ) : null}
          <Text
            variant="h2"
            color={colors.onPrimary}
            style={styles.title}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
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
                  tintColor={colors.primary}
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
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  bar: { backgroundColor: colors.primary, paddingHorizontal: space.lg, paddingBottom: space.md },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40 },
  backBtn: { width: 36, height: 40, justifyContent: 'center' },
  title: { flex: 1 },
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
