export interface SessionSet {
  reps: number;
  weight: number;
}

export interface SessionExercise {
  /** Id do exercício dentro do plano; serve para buscar a carga do treino anterior. */
  exerciseId: string;
  name: string;
  libraryId?: string;
  /** Apenas as séries marcadas como feitas. */
  sets: SessionSet[];
}

export interface WorkoutSession {
  id: string;
  planId: string;
  planName: string;
  dayId: string;
  dayLabel: string;
  startedAt: string;
  finishedAt: string;
  exercises: SessionExercise[];
}
