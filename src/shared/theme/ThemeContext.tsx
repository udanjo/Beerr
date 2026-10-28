import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type Palette } from './index';

export type ThemePreference = 'dark' | 'light' | 'system';

const STORAGE_KEY = '@beerr/theme';

interface ThemeValue {
  colors: Palette;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeValue>({
  colors: darkColors,
  isDark: true,
  preference: 'dark',
  setPreference: () => undefined,
});

function isPreference(value: string | null): value is ThemePreference {
  return value === 'dark' || value === 'light' || value === 'system';
}

interface ThemeProviderProps {
  children: ReactNode;
  /** Chamado quando a preferência salva terminou de carregar (evita o flash de tema errado). */
  onReady?: () => void;
}

export function ThemeProvider({ children, onReady }: ThemeProviderProps) {
  const system = useColorScheme();
  // O app nasceu escuro; quem nunca escolheu continua no escuro.
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (isPreference(saved)) setPreferenceState(saved);
      })
      .catch(() => undefined)
      .finally(() => onReady?.());
  }, [onReady]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const isDark = preference === 'system' ? system !== 'light' : preference === 'dark';
    return { colors: isDark ? darkColors : lightColors, isDark, preference, setPreference };
  }, [preference, system, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

const styleCache = new WeakMap<object, WeakMap<Palette, unknown>>();

/** Cores do tema atual e os estilos gerados por `makeStyles(colors)`, calculados uma vez por tema. */
export function useThemedStyles<T extends object>(
  makeStyles: (colors: Palette) => T,
): { colors: Palette; styles: T } {
  const { colors } = useTheme();
  let byPalette = styleCache.get(makeStyles);
  if (!byPalette) {
    byPalette = new WeakMap();
    styleCache.set(makeStyles, byPalette);
  }
  const cached = byPalette.get(colors) as T | undefined;
  if (cached) return { colors, styles: cached };
  const styles = makeStyles(colors);
  byPalette.set(colors, styles);
  return { colors, styles };
}
