import { getLibraryExercise } from '../../exercises/services/exerciseLibrary';
import type { MuscleGroup } from '../../plans/types';
import type { WorkoutSession } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DayTotals {
  minutes: number;
  volume: number;
  sets: number;
}

export interface WeekDay {
  date: Date;
  key: string;
  isToday: boolean;
  isFuture: boolean;
}

export const EMPTY_TOTALS: DayTotals = { minutes: 0, volume: 0, sets: 0 };

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  // Soma pelo calendário (e não em milissegundos) para não errar na virada do horário de verão.
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** A semana começa no domingo, como no calendário brasileiro. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  return addDays(day, -day.getDay());
}

export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function weekDays(weekStart: Date, today: Date): WeekDay[] {
  const todayKey = dayKey(today);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const key = dayKey(date);
    return { date, key, isToday: key === todayKey, isFuture: date.getTime() > today.getTime() && key !== todayKey };
  });
}

export function sessionMinutes(session: WorkoutSession): number {
  const ms = new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime();
  return Math.max(1, Math.round(ms / 60000));
}

export function sessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, exercise) =>
      total + exercise.sets.reduce((sum, set) => sum + set.reps * set.weight, 0),
    0,
  );
}

export function sessionSets(session: WorkoutSession): number {
  return session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
}

/** Totais por dia (chave AAAA-MM-DD), somando treinos do mesmo dia. */
export function totalsByDay(sessions: WorkoutSession[]): Map<string, DayTotals> {
  const totals = new Map<string, DayTotals>();
  for (const session of sessions) {
    const key = dayKey(new Date(session.finishedAt));
    const current = totals.get(key) ?? EMPTY_TOTALS;
    totals.set(key, {
      minutes: current.minutes + sessionMinutes(session),
      volume: current.volume + sessionVolume(session),
      sets: current.sets + sessionSets(session),
    });
  }
  return totals;
}

/** Semanas seguidas com ao menos um treino; a semana atual ainda em aberto não quebra a sequência. */
export function weeklyStreak(trainedDays: Set<string>, today: Date): number {
  const hasTrainingInWeek = (weekStart: Date) =>
    Array.from({ length: 7 }, (_, index) => dayKey(addDays(weekStart, index))).some((key) =>
      trainedDays.has(key),
    );

  let cursor = startOfWeek(today);
  if (!hasTrainingInWeek(cursor)) cursor = addDays(cursor, -7);

  let streak = 0;
  while (hasTrainingInWeek(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

/** Séries feitas por grupo muscular nos treinos da semana; exercícios sem biblioteca ficam de fora. */
export function setsByGroup(sessions: WorkoutSession[], weekStart: Date): [MuscleGroup, number][] {
  const start = weekStart.getTime();
  const end = start + 7 * DAY_MS + DAY_MS; // folga para o horário de verão
  const counts = new Map<MuscleGroup, number>();

  for (const session of sessions) {
    const finished = new Date(session.finishedAt);
    const inWeek = dayKey(finished) >= dayKey(weekStart) && dayKey(finished) <= dayKey(addDays(weekStart, 6));
    if (!inWeek || finished.getTime() > end) continue;

    for (const exercise of session.exercises) {
      const group = exercise.libraryId ? getLibraryExercise(exercise.libraryId)?.group : undefined;
      if (!group) continue;
      counts.set(group, (counts.get(group) ?? 0) + exercise.sets.length);
    }
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
