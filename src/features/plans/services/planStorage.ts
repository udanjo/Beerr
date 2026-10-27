import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_REST_SECONDS, type Exercise, type Plan, type PlannedSet } from '../types';

const STORAGE_KEY = '@beerr/plans';

/** Formato salvo nas versões anteriores: séries/reps/carga iguais para todas as séries. */
type StoredExercise = Omit<Exercise, 'sets' | 'restSeconds'> & {
  sets: PlannedSet[] | number;
  reps?: number;
  weight?: number;
  restSeconds?: number;
};

type StoredPlan = Omit<Plan, 'days'> & {
  days: (Omit<Plan['days'][number], 'exercises'> & { exercises: StoredExercise[] })[];
};

function normalizeExercise(stored: StoredExercise): Exercise {
  const sets = Array.isArray(stored.sets)
    ? stored.sets
    : Array.from({ length: Math.max(1, stored.sets) }, () => ({
        reps: stored.reps ?? 0,
        weight: stored.weight ?? 0,
      }));

  return {
    id: stored.id,
    name: stored.name,
    libraryId: stored.libraryId,
    sets,
    restSeconds: stored.restSeconds ?? DEFAULT_REST_SECONDS,
    notes: stored.notes,
  };
}

export async function loadPlans(): Promise<Plan[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const stored = JSON.parse(raw) as StoredPlan[];
    return stored.map((plan) => ({
      ...plan,
      days: plan.days.map((day) => ({ ...day, exercises: day.exercises.map(normalizeExercise) })),
    }));
  } catch {
    return [];
  }
}

export async function savePlans(plans: Plan[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}
