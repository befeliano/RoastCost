import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { t } from '@/locales';
import { colors, PALETTES, radius, space, useThemeStore, type PaletteKey } from '@/theme';

/** Ayarlar → Görünüm: accent colour is personal and stored on the device. */
export function ThemePicker() {
  const current = useThemeStore((s) => s.palette);
  const set = useThemeStore((s) => s.setPalette);
  return (
    <View style={styles.wrap}>
      <Text variant="small">{t('settings.themeHint')}</Text>
      <View style={styles.row}>
        {(Object.keys(PALETTES) as PaletteKey[]).map((k) => {
          const p = PALETTES[k];
          const on = k === current;
          return (
            <Pressable
              key={k}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={p.label}
              onPress={() => {
                void Haptics.selectionAsync();
                set(k);
              }}
              style={[styles.swatch, on && { borderColor: p.primary }]}
            >
              <View style={[styles.dot, { backgroundColor: p.primary }]}>
                {on ? <Icon name="check" size={20} color={p.onPrimary} strokeWidth={3} /> : null}
              </View>
              <Text variant="caption" color={on ? p.primaryText : colors.textMuted}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  swatch: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
