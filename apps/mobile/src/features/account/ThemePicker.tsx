import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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
              <LinearGradient
                colors={p.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dot}
              >
                {on ? <Icon name="check" size={16} color="#FFFFFF" strokeWidth={3} /> : null}
              </LinearGradient>
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
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
