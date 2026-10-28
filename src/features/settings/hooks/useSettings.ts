import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { hasNotificationPermission, requestNotificationPermission } from '../services/expiryReminders';

const STORAGE_KEY = '@beerr/settings';

interface StoredSettings {
  notifyExpiry?: boolean;
}

export function useSettings() {
  const [notifyExpiry, setNotifyExpiryState] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const stored = raw ? (JSON.parse(raw) as StoredSettings) : {};
        const granted = await hasNotificationPermission();
        // Se o usuário revogou a permissão nos ajustes do sistema, o interruptor volta a desligado.
        setNotifyExpiryState(Boolean(stored.notifyExpiry) && granted);
        setPermissionDenied(Boolean(stored.notifyExpiry) && !granted);
      } catch {
        // Sem preferência salva, os avisos ficam desligados.
      }
    })();
  }, []);

  const setNotifyExpiry = useCallback(async (next: boolean) => {
    if (next) {
      const granted = await requestNotificationPermission();
      setPermissionDenied(!granted);
      if (!granted) return;
    } else {
      setPermissionDenied(false);
    }
    setNotifyExpiryState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ notifyExpiry: next })).catch(() => undefined);
  }, []);

  return { notifyExpiry, permissionDenied, setNotifyExpiry };
}
