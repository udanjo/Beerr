import type { MuscleGroup } from '../types';

/** Respostas do questionário "Criar plano automático". */
export type Objective = 'hipertrofia' | 'emagrecimento' | 'forca' | 'saude';
export type Level = 'iniciante' | 'intermediario' | 'avancado';
export type EquipmentChoice = 'academia' | 'livres' | 'maquinas' | 'corpo';
export type FocusChoice = 'peito' | 'costas' | 'ombros' | 'bracos' | 'pernas' | 'abdomen';
export type SplitChoice = 'auto' | 'corpo-inteiro' | 'superior-inferior' | 'ppl' | 'grupo-por-dia';
export type Limitation = 'joelho' | 'ombro' | 'lombar' | 'punho';
export type CardioChoice = 'nao' | 'fim' | 'dia';

export interface AutoPlanAnswers {
  objective: Objective;
  level: Level;
  /** Dias de treino por semana (2 a 6). */
  days: number;
  /** Minutos por treino (45, 60, 75 ou 90). */
  minutes: number;
  equipment: EquipmentChoice;
  /** Até 2; vazio = equilibrado. */
  focus: FocusChoice[];
  split: SplitChoice;
  /** Vazio = nenhuma. */
  limitations: Limitation[];
  cardio: CardioChoice;
}

/** Contrato entre o gerador (regras locais hoje, IA no futuro) e `buildPlanFromSpec`. */
export interface SpecExercise {
  /** Id na biblioteca de exercícios. */
  libraryId: string;
  sets: number;
  reps: number;
  restSeconds: number;
  notes?: string;
}

export interface SpecDay {
  label: string;
  groups: MuscleGroup[];
  exercises: SpecExercise[];
}

export interface GeneratedPlanSpec {
  name: string;
  days: SpecDay[];
}

/** Limites aplicados pelo validador. */
export const SPEC_LIMITS = {
  minSets: 1,
  maxSets: 6,
  minReps: 1,
  maxReps: 30,
  maxExercisesPerDay: 9,
  maxNotes: 140,
} as const;
