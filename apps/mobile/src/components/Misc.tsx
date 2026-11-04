import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { colors, radius, space } from '@/theme';
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
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
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
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text
              variant="bodyStrong"
              color={on ? colors.onPrimary : colors.text}
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

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary' | 'info';
const TONE: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surface, fg: colors.textMuted },
  success: { bg: colors.successBg, fg: colors.success },
  warning: { bg: colors.warningBg, fg: colors.warning },
  danger: { bg: colors.dangerBg, fg: colors.danger },
  primary: { bg: colors.primaryBg, fg: colors.primary },
  info: { bg: '#EAF0F6', fg: colors.info },
};

export function Pill({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: Tone;
  icon?: IconName;
}) {
  const t = TONE[tone];
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
  tone = 'warning',
  icon = 'warning',
}: {
  text: string;
  tone?: Tone;
  icon?: IconName;
}) {
  const t = TONE[tone];
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
  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <Text variant="body">{label}</Text>
        {hint ? <Text variant="small">{hint}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
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
}: {
  title: string;
  subtitle?: string | undefined;
  right?: React.ReactNode;
  onPress?: () => void;
  icon?: IconName;
}) {
  const content = (
    <>
      {icon ? <Icon name={icon} color={colors.primary} /> : null}
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? <Text variant="small">{subtitle}</Text> : null}
      </View>
      {right}
      {onPress ? <Icon name="chevron" size={18} color={colors.textMuted} /> : null}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.primaryBg }]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text variant="h3" style={styles.section} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Our own empty-state drawing: a cup with a bean (no third-party illustration). */
export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <Svg width={120} height={96} viewBox="0 0 120 96" accessibilityElementsHidden>
        <Ellipse cx="60" cy="86" rx="44" ry="6" fill={colors.surface} />
        <Path
          d="M24 34h60v18c0 16-13 28-30 28h0C37 80 24 68 24 52V34Z"
          fill={colors.primaryBg}
          stroke={colors.primary}
          strokeWidth={3}
        />
        <Path
          d="M84 40h6a10 10 0 0 1 0 20h-7"
          fill="none"
          stroke={colors.primary}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Path
          d="M42 12c0 6 6 6 6 12M58 8c0 6 6 6 6 12"
          fill="none"
          stroke={colors.border}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Ellipse
          cx="54"
          cy="56"
          rx="9"
          ry="12"
          fill={colors.coffee}
          transform="rotate(-25 54 56)"
        />
        <Path
          d="M50 47c4 5-2 9 3 18"
          stroke={colors.surface}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
        <Circle cx="98" cy="20" r="3" fill={colors.border} />
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
  chips: { gap: space.sm, paddingVertical: 2 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 15 },
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
    minHeight: 56,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  section: { marginTop: space.md },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
  center: { textAlign: 'center' },
});
