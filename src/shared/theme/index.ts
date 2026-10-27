export const colors = {
  background: '#06141A',
  surface: '#101F27',
  surfaceAlt: '#18262E',
  border: '#1F323B',
  primary: '#7CFC4B',
  onPrimary: '#04130A',
  text: '#FFFFFF',
  textMuted: '#8E9BA3',
  danger: '#FF6B6B',
  white: '#FFFFFF',
  onWhite: '#0B1A20',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  sheet: 28,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
} as const;

/** Famílias carregadas em App.tsx via expo-google-fonts. */
export const fonts = {
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  display: 'BarlowCondensed_600SemiBold',
  displayBold: 'BarlowCondensed_700Bold',
} as const;
