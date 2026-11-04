import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { radius, useColors } from '@/theme';
import { noteTone, splitNotes } from './notes';

/** Tasting notes as small chips tinted by flavour family (fruit, chocolate, floral…). */
export function NoteChips({ notes, max }: { notes: string | null | undefined; max?: number }) {
  const c = useColors();
  const list = splitNotes(notes);
  const shown = max ? list.slice(0, max) : list;
  if (!shown.length) return null;
  return (
    <View style={styles.row} accessibilityLabel={`Tat notları: ${list.join(', ')}`}>
      {shown.map((n) => {
        const tone = noteTone(n) ?? { bg: c.primaryBg, fg: c.primaryText };
        return (
          <View key={n} style={[styles.chip, { backgroundColor: tone.bg }]}>
            <Text variant="caption" color={tone.fg}>
              {n}
            </Text>
          </View>
        );
      })}
      {max && list.length > max ? <Text variant="caption">+{list.length - max}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chip: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
});
