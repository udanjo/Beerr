# Estilização e Design System

## Tokens de Design

Centralize todos os valores visuais em um theme. Nunca use valores mágicos espalhados pelo código.

```tsx
// src/shared/theme/tokens.ts

export const colors = {
  // Cores primárias
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',

  // Neutras
  background: '#FFFFFF',
  surface: '#F8FAFC',
  border: '#E2E8F0',

  // Texto
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textInverse: '#FFFFFF',

  // Feedback
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  display: 40,
} as const;

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;
```

## Theme Provider

```tsx
// src/shared/theme/ThemeContext.tsx
import { createContext, useContext } from 'react';
import * as tokens from './tokens';

type Theme = {
  colors: typeof tokens.colors;
  spacing: typeof tokens.spacing;
  fontSize: typeof tokens.fontSize;
  borderRadius: typeof tokens.borderRadius;
  shadow: typeof tokens.shadow;
};

const lightTheme: Theme = {
  colors: tokens.colors,
  spacing: tokens.spacing,
  fontSize: tokens.fontSize,
  borderRadius: tokens.borderRadius,
  shadow: tokens.shadow,
};

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Aqui você pode adicionar lógica de dark mode futuramente
  return (
    <ThemeContext.Provider value={lightTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

## Responsividade

Para adaptar layouts a diferentes tamanhos de tela:

```tsx
// src/shared/hooks/useResponsive.ts
import { useWindowDimensions } from 'react-native';

type Breakpoint = 'sm' | 'md' | 'lg';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const breakpoint: Breakpoint =
    width < 375 ? 'sm' : width < 768 ? 'md' : 'lg';

  const isSmallScreen = breakpoint === 'sm';
  const isTablet = breakpoint === 'lg';

  return { width, height, breakpoint, isSmallScreen, isTablet };
}
```

Uso:
```tsx
function ProductGrid() {
  const { isTablet } = useResponsive();
  const numColumns = isTablet ? 3 : 2;

  return <FlatList numColumns={numColumns} ... />;
}
```

## Padrões de Estilização

### Use StyleSheet.create sempre
```tsx
// Bom — criado uma vez, referência estável
const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
});

// Ruim — objeto recriado a cada render
<View style={{ flex: 1, padding: 16 }} />
```

### Estilos dinâmicos com useMemo
```tsx
function Badge({ type }: { type: 'success' | 'error' }) {
  const theme = useTheme();

  const badgeStyle = useMemo(
    () => ({
      backgroundColor: type === 'success'
        ? theme.colors.success
        : theme.colors.error,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    }),
    [type, theme],
  );

  return <View style={badgeStyle}>...</View>;
}
```

### Composição de estilos
```tsx
// Use arrays para combinar estilos
<View style={[styles.card, isActive && styles.cardActive]} />

// Para variantes, crie um map
const variantStyles = {
  primary: styles.buttonPrimary,
  secondary: styles.buttonSecondary,
  ghost: styles.buttonGhost,
} as const;

<Pressable style={[styles.button, variantStyles[variant]]} />
```

### Gap em vez de margin
A partir do RN 0.71, use `gap` para espaçamento entre elementos:
```tsx
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12, // espaçamento uniforme entre filhos
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    rowGap: 24, // gap diferente para linhas
  },
});
```

## Dark Mode (quando implementar)

Estruture os tokens para suportar dark mode desde o início:

```tsx
const darkColors = {
  ...tokens.colors,
  background: '#0F172A',
  surface: '#1E293B',
  border: '#334155',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
};
```

Use `useColorScheme()` do React Native para detectar a preferência do sistema.
