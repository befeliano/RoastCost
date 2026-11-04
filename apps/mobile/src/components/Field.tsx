import { useEffect } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, fonts, radius, space } from '@/theme';
import { Text } from './Text';

interface Props extends TextInputProps {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  suffix?: string;
  /** label stays for screen readers but isn't drawn (e.g. when a heading above already says it) */
  hideLabel?: boolean;
}

/** Labelled input; on error: gentle shake + haptic (spec §11.4) and the error as text (§11.5). */
export function Field({ label, error, hint, suffix, hideLabel, style, ...rest }: Props) {
  const x = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!error) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (!reduce)
      x.value = withSequence(
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-3, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
  }, [error, reduce, x]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View style={[styles.wrap, anim]}>
      {hideLabel ? null : (
        <Text variant="caption" style={styles.label}>
          {label}
        </Text>
      )}
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          maxFontSizeMultiplier={1.6}
          {...rest}
        />
        {suffix ? <Text variant="small">{suffix}</Text> : null}
      </View>
      {error ? (
        <Text variant="small" color={colors.danger} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small">{hint}</Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { textTransform: 'uppercase' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    paddingHorizontal: space.md,
    minHeight: 50,
  },
  inputError: { borderColor: colors.danger },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
  },
});
