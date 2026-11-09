import type { LibraryExercise } from '../../exercises/services/exerciseLibrary';
import { DEFAULT_REST_SECONDS, DEFAULT_SECONDS, type Exercise } from '../types';

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 12;

let counter = 0;

export function createId(): string {
  counter += 1;
  return `${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 6)}`;
}

// Cardio e isométricos contam tempo, não repetições.
const TIMED_IDS = new Set(['Plank', 'Side_Bridge']);

export function isTimedByDefault(library: LibraryExercise): boolean {
  return library.group === 'Cardio' || TIMED_IDS.has(library.id);
}

export function createExerciseFromLibrary(library: LibraryExercise): Exercise {
  const timed = isTimedByDefault(library);
  return {
    id: createId(),
    name: library.name,
    libraryId: library.id,
    sets: Array.from({ length: DEFAULT_SETS }, () => ({
      reps: timed ? DEFAULT_SECONDS : DEFAULT_REPS,
      weight: 0,
    })),
    restSeconds: DEFAULT_REST_SECONDS,
    timed: timed || undefined,
  };
}
