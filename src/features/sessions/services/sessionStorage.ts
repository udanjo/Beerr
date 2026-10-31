import AsyncStorage from '@react-native-async-storage/async-storage';

import { markBackupDirty } from '../../backup/services/backupMeta';
import type { WorkoutSession } from '../types';

/** Cada conta tem a própria chave, para nunca misturar treinos de duas pessoas no mesmo aparelho. */
export const sessionsKey = (uid: string) => `@beerr/u/${uid}/sessions`;

export async function loadSessions(uid: string): Promise<WorkoutSession[]> {
  const raw = await AsyncStorage.getItem(sessionsKey(uid));
  if (!raw) return [];

  try {
    return JSON.parse(raw) as WorkoutSession[];
  } catch {
    return [];
  }
}

export async function saveSessions(uid: string, sessions: WorkoutSession[]): Promise<void> {
  await AsyncStorage.setItem(sessionsKey(uid), JSON.stringify(sessions));
  markBackupDirty(uid).catch(() => undefined);
}
