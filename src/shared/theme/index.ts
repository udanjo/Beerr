export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  /** Preenchimento de destaque (botões, seleção); sempre o verde neon. */
  primary: string;
  onPrimary: string;
  /** Cor de destaque para texto, ícones e bordas; no tema claro é um verde escuro com contraste. */
  accent: string;
  text: string;
  textMuted: string;
  danger: string;
  white: string;
  onWhite: string;
  overlay: string;
}

export const darkColors: Palette = {
  background: '#06141A',
  surface: '#101F27',
  surfaceAlt: '#18262E',
  border: '#1F323B',
  primary: '#7CFC4B',
  onPrimary: '#04130A',
  accent: '#7CFC4B',
  text: '#FFFFFF',
  textMuted: '#8E9BA3',
  danger: '#FF6B6B',
  white: '#FFFFFF',
  onWhite: '#0B1A20',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const lightColors: Palette = {
  background: '#F3F6F4',
  surface: '#FFFFFF',
  surfaceAlt: '#E8EEEA',
  border: '#D3DDD6',
  primary: '#7CFC4B',
  onPrimary: '#04130A',
  accent: '#1B7A2E',
  text: '#0B1A20',
  textMuted: '#5A6A72',
  danger: '#C62828',
  white: '#FFFFFF',
  onWhite: '#0B1A20',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

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
