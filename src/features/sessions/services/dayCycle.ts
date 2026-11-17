import type { PlanDay } from '../../plans/types';
import type { WorkoutSession } from '../types';

export interface DayCycle {
  /** Dias já feitos no ciclo atual. */
  doneIds: Set<string>;
  /** Primeiro dia ainda não feito, na ordem do plano. */
  nextId: string | null;
}

/**
 * Ciclo atual do plano: sessões mais recentes primeiro, acumulando dias distintos até repetir um
 * deles ou completar todos (aí o ciclo recomeça sem checks). `sessions` vem da mais recente.
 */
export function currentCycle(planId: string, days: PlanDay[], sessions: WorkoutSession[]): DayCycle {
  const valid = new Set(days.map((day) => day.id));
  const done = new Set<string>();
  // Ordena por data (backup restaurado pode vir fora de ordem).
  const recentFirst = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  let lastDayId: string | null = null;
  for (const session of recentFirst) {
    if (session.planId !== planId || !valid.has(session.dayId)) continue;
    lastDayId ??= session.dayId;
    if (done.has(session.dayId)) break;
    done.add(session.dayId);
  }
  if (done.size >= days.length) {
    // Ciclo fechado: recomeça sem checks e sugere o dia seguinte ao último treinado (circular),
    // não o primeiro, que pode ser justamente o que acabou de ser feito.
    done.clear();
    const lastIndex = days.findIndex((day) => day.id === lastDayId);
    return { doneIds: done, nextId: days[(lastIndex + 1) % days.length]?.id ?? null };
  }
  const next = days.find((day) => !done.has(day.id));
  return { doneIds: done, nextId: next?.id ?? null };
}
