import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { colors, fonts, radius, space, useColors, type ThemeColors } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipsScroll}
      contentContainerStyle={styles.chips}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.chip, on && { backgroundColor: c.primary, borderColor: c.primary }]}
          >
            <Text
              variant="bodyStrong"
              color={on ? c.onPrimary : colors.text}
              style={styles.chipText}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary' | 'info' | 'accent';
function tone(t: Tone, c: ThemeColors): { bg: string; fg: string } {
  switch (t) {
    case 'success':
      return { bg: c.successBg, fg: c.success };
    case 'warning':
      return { bg: c.warningBg, fg: c.warning };
    case 'danger':
      return { bg: c.dangerBg, fg: c.danger };
    case 'primary':
      return { bg: c.primaryBg, fg: c.primaryText };
    case 'info':
      return { bg: c.infoBg, fg: c.info };
    case 'accent':
      return { bg: c.accent, fg: c.onAccent };
    default:
      return { bg: c.surface, fg: c.textMuted };
  }
}

export function Pill({
  label,
  tone: tn = 'neutral',
  icon,
}: {
  label: string;
  tone?: Tone;
  icon?: IconName;
}) {
  const t = tone(tn, useColors());
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      {icon ? <Icon name={icon} size={14} color={t.fg} strokeWidth={2.2} /> : null}
      <Text variant="caption" color={t.fg}>
        {label}
      </Text>
    </View>
  );
}

export function Notice({
  text,
  tone: tn = 'warning',
  icon = 'warning',
}: {
  text: string;
  tone?: Tone;
  icon?: IconName;
}) {
  const t = tone(tn, useColors());
  return (
    <View style={[styles.notice, { backgroundColor: t.bg }]} accessibilityRole="alert">
      <Icon name={icon} size={20} color={t.fg} />
      <Text variant="small" color={t.fg} style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

export function ToggleRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  const c = useColors();
  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <Text variant="body" style={styles.rowTitle}>
          {label}
        </Text>
        {hint ? <Text variant="small">{hint}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: c.primary, false: c.border }}
        thumbColor="#FFFFFF"
        // react-native-web otherwise paints a teal thumb when on
        {...({ activeThumbColor: '#FFFFFF' } as object)}
      />
    </View>
  );
}

export function Row({
  title,
  subtitle,
  right,
  onPress,
  icon,
  left,
}: {
  title: string;
  subtitle?: string | undefined;
  right?: React.ReactNode;
  onPress?: () => void;
  icon?: IconName;
  left?: React.ReactNode;
}) {
  const c = useColors();
  const content = (
    <>
      {left}
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: c.primaryBg }]}>
          <Icon name={icon} size={17} color={c.primaryText} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <Text variant="body" style={styles.rowTitle}>
          {title}
        </Text>
        {subtitle ? <Text variant="small">{subtitle}</Text> : null}
      </View>
      {right}
      {onPress ? <Icon name="chevron" size={18} color={c.textMuted} /> : null}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.primaryBg }]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text variant="h3" style={styles.flex} accessibilityRole="header">
        {children}
      </Text>
      {action}
    </View>
  );
}

/** Our own empty-state drawing: a cup with a bean (no third-party illustration). */
export function EmptyState({ title, body }: { title: string; body?: string }) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <Svg width={120} height={96} viewBox="0 0 120 96" accessibilityElementsHidden>
        <Ellipse cx="60" cy="86" rx="44" ry="6" fill={c.border} />
        <Path
          d="M24 34h60v18c0 16-13 28-30 28h0C37 80 24 68 24 52V34Z"
          fill={c.primaryBg}
          stroke={c.primary}
          strokeWidth={3}
        />
        <Path
          d="M84 40h6a10 10 0 0 1 0 20h-7"
          fill="none"
          stroke={c.primary}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Path
          d="M42 12c0 6 6 6 6 12M58 8c0 6 6 6 6 12"
          fill="none"
          stroke={c.border}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Ellipse cx="54" cy="56" rx="9" ry="12" fill={c.coffee} transform="rotate(-25 54 56)" />
        <Path
          d="M50 47c4 5-2 9 3 18"
          stroke={c.surface}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
        <Circle cx="98" cy="20" r="3" fill={c.border} />
      </Svg>
      <Text variant="h3" style={styles.center}>
        {title}
      </Text>
      {body ? (
        <Text variant="small" style={styles.center}>
          {body}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chips: { gap: space.sm, paddingVertical: 2, alignItems: 'center' },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  chipText: { fontSize: 14 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  notice: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'flex-start',
    padding: space.md,
    borderRadius: radius.md,
  },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  rowTitle: { fontSize: 14.5, fontFamily: fonts.medium },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.md },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
  center: { textAlign: 'center' },
});
