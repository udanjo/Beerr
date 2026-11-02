import { useSyncExternalStore } from 'react';

import { getCustomExercises, subscribeCustomExercises } from '../services/customExercises';

/** Lista reativa dos exercícios personalizados; re-renderiza quando algum é criado, editado ou removido. */
export function useCustomExercises() {
  return useSyncExternalStore(subscribeCustomExercises, getCustomExercises);
}
