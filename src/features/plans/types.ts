export const MUSCLE_GROUPS = [
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Antebraço',
  'Abdômen',
  'Quadríceps',
  'Posterior',
  'Glúteos',
  'Panturrilha',
  'Cardio',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MAX_DAYS = 7;
export const DEFAULT_REST_SECONDS = 90;
export const REST_OPTIONS = [30, 45, 60, 90, 120, 180] as const;

/** Planos e sessões antigos gravaram "Dia A"; hoje se grava só a letra. */
export function displayDayLabel(label: string): string {
  return label.replace(/^Dia\s+/i, '');
}

/** Série planejada; cada série tem a sua própria repetição e carga. */
export interface PlannedSet {
  reps: number;
  /** Carga em kg; 0 para exercícios sem carga. */
  weight: number;
}

export interface Exercise {
  id: string;
  name: string;
  /** Id do exercício na biblioteca (animação e instruções); ausente se digitado à mão. */
  libraryId?: string;
  sets: PlannedSet[];
  restSeconds: number;
  /** Observação livre do usuário (ajuste do banco, pegada, dor, etc.). */
  notes?: string;
}

export interface PlanDay {
  id: string;
  /** Rótulo do treino, ex.: "A" (planos antigos: "Dia A"). */
  label: string;
  muscleGroups: MuscleGroup[];
  exercises: Exercise[];
}

export interface Plan {
  id: string;
  name: string;
  days: PlanDay[];
  createdAt: string;
}

export interface NewPlan {
  name: string;
  days: Pick<PlanDay, 'label' | 'muscleGroups'>[];
}
