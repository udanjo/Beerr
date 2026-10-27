import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppShell } from './src/app/AppShell';
import { colors } from './src/shared/theme';

// A splash nativa cobre o carregamento das fontes, sem tela intermediária.
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hide();
  }, [fontsLoaded]);

  return (
    <SafeAreaProvider>
      {fontsLoaded ? (
        <AppShell />
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.background }} />
      )}
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
