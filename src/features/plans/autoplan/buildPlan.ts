import { getLibraryExercise } from '../../exercises/services/exerciseLibrary';
import { createId } from '../services/exerciseFactory';
import { MAX_DAYS, REST_OPTIONS, type Exercise, type MuscleGroup, type Plan, type PlanDay } from '../types';
import { SPEC_LIMITS, type GeneratedPlanSpec } from './types';

export interface BuildResult {
  plan: Plan | null;
  /** Itens descartados ou corrigidos, para depuração. */
  warnings: string[];
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : min)));

function nearestRest(seconds: number): number {
  if (seconds <= 0) return 0;
  return REST_OPTIONS.reduce((best, option) =>
    Math.abs(option - seconds) < Math.abs(best - seconds) ? option : best,
  );
}

/**
 * Valida um spec contra a biblioteca e monta o Plan. Ids que não existem são descartados, os
 * grupos do dia vêm dos exercícios que sobraram e a carga (kg) é sempre 0: o treino já preenche
 * pela última sessão.
 */
export function buildPlanFromSpec(spec: GeneratedPlanSpec): BuildResult {
  const warnings: string[] = [];
  const days: PlanDay[] = [];

  for (const specDay of spec.days.slice(0, MAX_DAYS)) {
    const seen = new Set<string>();
    const exercises: Exercise[] = [];
    const groups: MuscleGroup[] = [];

    for (const item of specDay.exercises) {
      const library = getLibraryExercise(item.libraryId);
      if (!library) {
        warnings.push(`Exercício inexistente: ${item.libraryId}`);
        continue;
      }
      if (seen.has(library.id)) continue;
      if (exercises.length >= SPEC_LIMITS.maxExercisesPerDay) break;
      seen.add(library.id);

      const reps = clamp(item.reps, SPEC_LIMITS.minReps, SPEC_LIMITS.maxReps);
      const sets = clamp(item.sets, SPEC_LIMITS.minSets, SPEC_LIMITS.maxSets);
      exercises.push({
        id: createId(),
        name: library.name,
        libraryId: library.id,
        sets: Array.from({ length: sets }, () => ({ reps, weight: 0 })),
        restSeconds: nearestRest(item.restSeconds),
        notes: item.notes?.trim().slice(0, SPEC_LIMITS.maxNotes) || undefined,
      });
      if (!groups.includes(library.group)) groups.push(library.group);
    }

    if (exercises.length === 0) {
      warnings.push(`Dia ${specDay.label} ficou sem exercícios válidos`);
      continue;
    }
    days.push({ id: createId(), label: specDay.label, muscleGroups: groups, exercises });
  }

  if (days.length === 0) return { plan: null, warnings };

  return {
    plan: {
      id: createId(),
      name: spec.name.trim() || 'Plano automático',
      createdAt: new Date().toISOString(),
      days,
    },
    warnings,
  };
}
