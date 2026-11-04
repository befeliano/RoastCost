import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { colors, space } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface ToastState {
  msg: { id: number; text: string; icon: IconName } | null;
  show(text: string, icon?: IconName): void;
  hide(): void;
}

const useToastStore = create<ToastState>((set) => ({
  msg: null,
  show: (text, icon = 'check') => set({ msg: { id: Date.now(), text, icon } }),
  hide: () => set({ msg: null }),
}));

/** Small, quiet confirmation at the top ("Kaydedildi"). Call from anywhere. */
export const toast = (text: string, icon?: IconName) => useToastStore.getState().show(text, icon);

export function ToastHost() {
  const msg = useToastStore((s) => s.msg);
  const hide = useToastStore((s) => s.hide);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(hide, 1800);
    return () => clearTimeout(timer);
  }, [msg, hide]);
  if (!msg) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + space.sm }]}>
      <Animated.View
        key={msg.id}
        entering={FadeInUp.duration(200)}
        exiting={FadeOutUp.duration(160)}
        style={styles.toast}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <Icon name={msg.icon} size={18} color="#FFFFFF" strokeWidth={2.4} />
        <Text variant="bodyStrong" color="#FFFFFF">
          {msg.text}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.text,
    borderRadius: 999,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
  },
});
