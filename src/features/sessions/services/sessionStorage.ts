import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WorkoutSession } from '../types';

const STORAGE_KEY = '@beerr/sessions';

export async function loadSessions(): Promise<WorkoutSession[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as WorkoutSession[];
  } catch {
    return [];
  }
}

export async function saveSessions(sessions: WorkoutSession[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}
