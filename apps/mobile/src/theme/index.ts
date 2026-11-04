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

/** Type scale — Plus Jakarta Sans (OFL), one step smaller than before (Burak: "puntolar biraz küçülsün"). */
export const type = {
  h1: {
    fontFamily: fonts.heading,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: fonts.bold,
    fontSize: 19,
    lineHeight: 25,
    color: colors.text,
    letterSpacing: -0.2,
  },
  h3: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.text },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.text },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  caption: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    lineHeight: 15,
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  money: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, ...num },
  bigMoney: {
    fontFamily: fonts.heading,
    fontSize: 36,
    lineHeight: 42,
    color: colors.text,
    letterSpacing: -0.6,
    ...num,
  },
  button: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
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
