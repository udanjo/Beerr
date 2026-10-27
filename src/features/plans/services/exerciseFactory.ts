import type { LibraryExercise } from '../../exercises/services/exerciseLibrary';
import { DEFAULT_REST_SECONDS, type Exercise } from '../types';

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 12;

let counter = 0;

export function createId(): string {
  counter += 1;
  return `${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createExerciseFromLibrary(library: LibraryExercise): Exercise {
  return {
    id: createId(),
    name: library.name,
    libraryId: library.id,
    sets: Array.from({ length: DEFAULT_SETS }, () => ({ reps: DEFAULT_REPS, weight: 0 })),
    restSeconds: DEFAULT_REST_SECONDS,
  };
}
