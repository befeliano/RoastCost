import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { colors, fonts, radius, space, useColors, type ThemeColors } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { Tap } from './Tap';

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
          <Tap
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            hitSlop={{ top: 4, bottom: 4 }}
            style={[styles.chip, on && { backgroundColor: c.primary, borderColor: c.primary }]}
          >
            <Text
              variant="bodyStrong"
              color={on ? c.onPrimary : colors.text}
              style={styles.chipText}
            >
              {o.label}
            </Text>
          </Tap>
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
    <Tap accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.row}>
      {content}
    </Tap>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}

export function SectionTitle({
  children,
  action,
  count,
}: {
  children: string;
  action?: React.ReactNode;
  count?: number;
}) {
  return (
    <View style={styles.sectionRow}>
      <View style={[styles.flex, styles.sectionTitle]}>
        <Text variant="h3" accessibilityRole="header">
          {children}
        </Text>
        {count !== undefined ? (
          <View style={styles.count}>
            <Text variant="caption">{count}</Text>
          </View>
        ) : null}
      </View>
      {action}
    </View>
  );
}

/** iOS-style grouped list: rounded container, hairline separators, no line under the last row. */
export function RowGroup({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <View style={styles.groupInner}>{children}</View>
    </View>
  );
}

/** Failed query: what happened + a retry button. */
export function ErrorState({ onRetry, text }: { onRetry: () => void; text?: string }) {
  const c = useColors();
  return (
    <View style={styles.error}>
      <Icon name="warning" color={c.danger} />
      <Text variant="body" style={styles.center}>
        {text ?? 'Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.'}
      </Text>
      <Tap
        accessibilityRole="button"
        onPress={onRetry}
        style={[styles.retry, { borderColor: c.primaryText }]}
      >
        <Icon name="refresh" size={18} color={c.primaryText} />
        <Text variant="bodyStrong" color={c.primaryText}>
          Tekrar dene
        </Text>
      </Tap>
    </View>
  );
}

/** Our own empty-state drawing: a cup with a bean (no third-party illustration). */
export function EmptyState({
  title,
  body,
  action,
  compact,
}: {
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
  /** text only, small padding — for a second empty section on the same screen */
  compact?: boolean;
}) {
  const c = useColors();
  return (
    <View style={[styles.empty, compact && styles.emptyCompact]}>
      {compact ? null : (
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
      )}
      <Text variant="h3" style={styles.center}>
        {title}
      </Text>
      {body ? (
        <Text variant="small" style={styles.center}>
          {body}
        </Text>
      ) : null}
      {action ? (
        <Tap
          accessibilityRole="button"
          onPress={action.onPress}
          style={[styles.retry, { borderColor: c.primaryText }]}
        >
          {action.icon ? <Icon name={action.icon} size={18} color={c.primaryText} /> : null}
          <Text variant="bodyStrong" color={c.primaryText}>
            {action.label}
          </Text>
        </Tap>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  count: {
    minWidth: 22,
    paddingHorizontal: 6,
    minHeight: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  group: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  // hides the separator under the last row
  groupInner: { marginBottom: -1 },
  error: { alignItems: 'center', gap: space.md, paddingVertical: space.xl },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: space.lg,
    minHeight: 44,
    marginTop: space.xs,
  },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  emptyCompact: { paddingVertical: space.md },
  center: { textAlign: 'center' },
});
