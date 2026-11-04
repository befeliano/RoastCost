import { Pressable, StyleSheet, View } from 'react-native';
import { colors, space, useColors } from '@/theme';
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
  const c = useColors();
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        onPress={() => onChange(!checked)}
        style={styles.press}
      >
        <View
          style={[
            styles.box,
            { borderColor: c.primaryText },
            checked && { backgroundColor: c.primary, borderColor: c.primary },
          ]}
        >
          {checked ? <Icon name="check" size={18} color={c.onPrimary} strokeWidth={3} /> : null}
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
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1 },
});
