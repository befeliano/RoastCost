import { Pressable, StyleSheet, View } from 'react-native';
import { colors, space } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

/** Unchecked by default (spec §14.3). */
export function Checkbox({
  checked,
  onChange,
  label,
  right,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        onPress={() => onChange(!checked)}
        style={styles.press}
      >
        <View style={[styles.box, checked && styles.boxOn]}>
          {checked ? (
            <Icon name="check" size={18} color={colors.onPrimary} strokeWidth={3} />
          ) : null}
        </View>
        <Text variant="body" style={styles.label}>
          {label}
        </Text>
      </Pressable>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  press: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.primary },
  label: { flex: 1 },
});
