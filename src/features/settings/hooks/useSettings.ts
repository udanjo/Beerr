import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { hasNotificationPermission, requestNotificationPermission } from '../services/expiryReminders';

const STORAGE_KEY = '@beerr/settings';

interface StoredSettings {
  notifyExpiry?: boolean;
  allowEditDuringWorkout?: boolean;
}

export function useSettings() {
  const [notifyExpiry, setNotifyExpiryState] = useState(false);
  const [allowEditDuringWorkout, setAllowEditState] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  // Cada chave grava mesclada com as demais; senão um interruptor apagaria o outro.
  const storedRef = useRef<StoredSettings>({});

  const save = useCallback((patch: StoredSettings) => {
    storedRef.current = { ...storedRef.current, ...patch };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storedRef.current)).catch(() => undefined);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const stored = raw ? (JSON.parse(raw) as StoredSettings) : {};
        storedRef.current = { ...stored, ...storedRef.current };
        setAllowEditState(Boolean(stored.allowEditDuringWorkout));
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
    save({ notifyExpiry: next });
  }, [save]);

  const setAllowEditDuringWorkout = useCallback(
    (next: boolean) => {
      setAllowEditState(next);
      save({ allowEditDuringWorkout: next });
    },
    [save],
  );

  return {
    notifyExpiry,
    permissionDenied,
    setNotifyExpiry,
    allowEditDuringWorkout,
    setAllowEditDuringWorkout,
  };
}
