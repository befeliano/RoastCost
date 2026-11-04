import { Text as RNText, type TextProps } from 'react-native';
import { type } from '@/theme';

type Variant = keyof typeof type;

export function Text({
  variant = 'body',
  style,
  color,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[type[variant], color ? { color } : null, style]}
    />
  );
}
