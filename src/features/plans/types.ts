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
  /** Exercício por tempo (ex.: prancha): em `sets[].reps` ficam os segundos de cada série. */
  timed?: boolean;
  /** Carga por lado (ex.: halter em cada mão); ausente = peso total. Vale para todas as séries. */
  unilateral?: boolean;
}

export const DEFAULT_SECONDS = 30;

/** "30 s", "1:00", "1:30": segundos no formato curto. */
export function formatSeconds(total: number): string {
  if (total < 60) return `${total} s`;
  const pad = (value: number) => String(value).padStart(2, '0');
  if (total >= 3600) {
    return `${Math.floor(total / 3600)}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
  }
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}

/** Duração para a roda de valores: "45 s", "25 min", "1:30", "1h05". */
export function formatDuration(total: number): string {
  if (total < 60) return `${total} s`;
  if (total % 60 !== 0) return formatSeconds(total);
  const minutes = total / 60;
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${minutes / 60}h` : `${Math.floor(minutes / 60)}h${String(rest).padStart(2, '0')}`;
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
  /** Último dia de validade (AAAA-MM-DD, data local); ausente = sem prazo. */
  expiresAt?: string;
}

export interface NewPlan {
  name: string;
  expiresAt?: string;
  days: Pick<PlanDay, 'label' | 'muscleGroups'>[];
}
