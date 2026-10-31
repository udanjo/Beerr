import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AccountGate } from './src/app/AccountGate';
import { ThemeProvider, useTheme } from './src/shared/theme/ThemeContext';

// A splash nativa cobre o carregamento das fontes, sem tela intermediária.
SplashScreen.preventAutoHideAsync();

function Root({ ready }: { ready: boolean }) {
  const { colors, isDark } = useTheme();

  return (
    <>
      {ready ? <AccountGate /> :<View style={{ flex: 1, backgroundColor: colors.background }} />}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [themeReady, setThemeReady] = useState(false);
  const handleThemeReady = useCallback(() => setThemeReady(true), []);
  const ready = fontsLoaded && themeReady;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  return (
    <SafeAreaProvider>
      <ThemeProvider onReady={handleThemeReady}>
        <Root ready={ready} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
