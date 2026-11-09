import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Exercise, Plan, PlanDay } from '../../plans/types';
import type { SessionSet } from '../types';

export interface SetDraft {
  weight: number;
  reps: number;
  done: boolean;
}

export interface ExerciseProgress {
  exercise: Exercise;
  sets: SetDraft[];
  /** Séries do último treino deste exercício, só para exibir. */
  previous: SessionSet[] | undefined;
  /** Mudança feita durante o treino em relação ao plano. */
  origin?: 'replaced' | 'added';
}

/** Treino em andamento, guardado para sobreviver ao app ser fechado. Fica só no aparelho. */
export interface WorkoutDraft {
  plan: Plan;
  day: PlanDay;
  startedAt: string;
  items: ExerciseProgress[];
  reopenedIds: string[];
  /** Exercícios que já geraram o aviso de aumento de peso neste treino. */
  celebratedIds?: string[];
}

const draftKey = (uid: string) => `@beerr/u/${uid}/activeWorkout`;

// Gravações em fila: um "limpar" nunca é atropelado por uma gravação mais antiga.
let queue: Promise<unknown> = Promise.resolve();
const enqueue = (task: () => Promise<unknown>) => {
  queue = queue.then(task, task).catch(() => undefined);
};

export async function loadWorkoutDraft(uid: string): Promise<WorkoutDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(draftKey(uid));
    if (!raw) return null;
    const draft = JSON.parse(raw) as WorkoutDraft;
    if (!draft?.plan || !draft.day || !Array.isArray(draft.items) || draft.items.length === 0) return null;
    return { ...draft, reopenedIds: draft.reopenedIds ?? [] };
  } catch {
    return null;
  }
}

export function saveWorkoutDraft(uid: string, draft: WorkoutDraft): void {
  const json = JSON.stringify(draft);
  enqueue(() => AsyncStorage.setItem(draftKey(uid), json));
}

export function clearWorkoutDraft(uid: string): void {
  enqueue(() => AsyncStorage.removeItem(draftKey(uid)));
}
