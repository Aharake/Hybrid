// Design tokens for the (new, redesigned) Tracker app — an isolated palette from
// theme/tokens.ts on purpose, so nothing here can visually regress the Onboarding
// flow, which still owns that file. Font *loading* is shared (see theme/fonts.ts,
// which already registers the Inter weights used here); only family-name re-exports
// live in this file's `fonts` for a single Tracker-scoped import surface.

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

export const colors = {
  bg: '#0a0a0b',
  surface: '#1c1c1f',
  text: '#f5f5f6',
  neutral100: '#141416',
  neutral200: '#1c1c1f',
  neutral300: '#232326',
  neutral400: '#3a3a3f',
  neutral500: '#8a8a90',
  neutral600: '#9a9aa0',
  neutral700: '#c7c7cb',
  neutral800: '#e2e2e4',
  neutral900: '#fafafa',
  divider: '#232326',
  accent200: '#d6d6d9',
  strength: '#e2872f',
  running: '#0864c4',
  secondary: '#f5f5f6',
  rcGoal: '#2fa84a',
  rcGoalDim: '#173322',
  rcGoalGlow: 'rgba(47,168,74,0.3)',
  rcConsistency: '#7d92a6',
  rcConsistencyDim: '#232a30',
  rcConsistencyGlow: 'rgba(125,146,166,0.3)',
  rcVolume: '#2563a8',
  rcVolumeDim: '#16283f',
  rcVolumeGlow: 'rgba(37,99,168,0.3)',
  red: '#ef4444',
  green: '#22c55e',
  amber: '#f5a623',
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
} as const;

export const typography = {
  kicker: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    color: colors.accent200,
    marginBottom: 6,
    fontFamily: fonts.medium,
  },
  hTitle: { fontFamily: fonts.medium, fontSize: 24, color: colors.text },
  sectionTitle: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
};
