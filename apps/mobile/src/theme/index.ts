import { Platform, type TextStyle } from 'react-native';

import { colors } from './colors';

export { colors };
export {
  PALETTES,
  useColors,
  useThemeStore,
  type Palette,
  type PaletteKey,
  type ThemeColors,
} from './palettes';

export const fonts = {
  heading: 'PlusJakartaSans_800ExtraBold',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 12, lg: 16, pill: 999 } as const;
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;

const num: TextStyle = { fontVariant: ['tabular-nums'] };

export const type = {
  h1: {
    fontFamily: fonts.heading,
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: fonts.bold,
    fontSize: 21,
    lineHeight: 27,
    color: colors.text,
    letterSpacing: -0.3,
  },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.text },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.text },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.textMuted },
  caption: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  money: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, ...num },
  bigMoney: {
    fontFamily: fonts.heading,
    fontSize: 40,
    lineHeight: 46,
    color: colors.text,
    letterSpacing: -1,
    ...num,
  },
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 },
} satisfies Record<string, TextStyle>;

export const shadow = Platform.select({
  ios: {
    shadowColor: '#2B1F1A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  default: { elevation: 1 },
});
