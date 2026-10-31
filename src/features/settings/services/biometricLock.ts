import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

// Chave própria (e não @beerr/settings) para não disputar a gravação com o useSettings.
const STORAGE_KEY = '@beerr/applock';

export async function loadAppLockEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? Boolean((JSON.parse(raw) as { enabled?: boolean }).enabled) : false;
  } catch {
    return false;
  }
}

export async function saveAppLockEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled }));
}

/** O aparelho tem alguma forma de desbloqueio cadastrada (biometria, PIN ou padrão). */
export async function lockAvailable(): Promise<boolean> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

export type AuthResult = 'success' | 'cancelled' | 'failed' | 'lockout';

/** Pede digital/rosto; o PIN ou padrão do sistema fica como saída (nunca desligue o fallback). */
export async function authenticate(promptMessage: string): Promise<AuthResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });
    if (result.success) return 'success';
    switch (result.error) {
      case 'user_cancel':
      case 'system_cancel':
      case 'app_cancel':
        return 'cancelled';
      case 'lockout':
        return 'lockout';
      default:
        return 'failed';
    }
  } catch {
    return 'failed';
  }
}
