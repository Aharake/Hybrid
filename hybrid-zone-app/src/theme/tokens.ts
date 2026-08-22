// Design tokens — keep this the single source of truth for color/spacing/type.
// Values match Hybrid Zone — Onboarding.html's and Tracker.html's :root blocks —
// the two mockups share most values but not all (e.g. --yellow differs), so
// Tracker-only tokens are named distinctly rather than overwriting Onboarding's.

export const colors = {
  bg: '#000000',
  card: '#19191b',
  card2: '#222224',
  text: '#ffffff',
  textDim: '#98989f',
  textDimmer: '#5c5c60',
  track: '#2c2c2e',
  green: '#34c759',
  red: '#ff453a',
  yellow: '#ffd60a', // Onboarding.html's --yellow
  trackerYellow: '#ffb454', // Tracker.html's --yellow (weight numbers, mini-bars)
  pink: '#ff2d78', // Tracker.html-only (multiset icons)
  blue: '#0a84ff',
  disabledBg: '#3a3a3c',
  disabledText: '#818186',
  greenText: '#08240f', // text/icon color placed on top of a green fill (badge-rec)
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  lg: 26,
  md: 20,
  full: 999,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  serifItalic: 'PlayfairDisplay_600SemiBold_Italic',
  serifItalicBold: 'PlayfairDisplay_700Bold_Italic',
} as const;

export const typography = {
  title: { fontFamily: fonts.serifItalic, fontSize: 32, lineHeight: 37 },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textDim },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    letterSpacing: 0.8,
    color: colors.textDimmer,
    textTransform: 'uppercase' as const,
  },
};
