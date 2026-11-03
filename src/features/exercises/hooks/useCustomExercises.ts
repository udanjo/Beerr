import { useSyncExternalStore } from 'react';

import { getCustomExercises, subscribeCustomExercises } from '../services/customExercises';

/** Lista reativa dos exercícios personalizados; re-renderiza quando algum é criado, editado ou removido. */
export function useCustomExercises() {
  return useSyncExternalStore(subscribeCustomExercises, getCustomExercises);
}

/**
 * Devolve uma função que dá o nome atual do exercício. Planos e treinos guardam uma cópia do nome;
 * para exercícios personalizados renomeados vale o nome da biblioteca.
 */
export function useExerciseName() {
  const customs = useCustomExercises();
  return (exercise: { name: string; libraryId?: string }) =>
    (exercise.libraryId && customs.find((custom) => custom.id === exercise.libraryId)?.name) ||
    exercise.name;
}
