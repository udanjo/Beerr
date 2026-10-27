import type { MuscleGroup } from '../../plans/types';
import rawExercises from '../data/exercises.json';

export interface LibraryExercise {
  id: string;
  name: string;
  group: MuscleGroup;
  /** Músculo principal, no nome usado na interface (ex.: "Dorsais"). */
  target: string;
  secondary: string[];
  equipment: string | null;
  level: string;
  instructions: string[];
  images: string[];
}

// Dados: free-exercise-db (Unlicense) traduzido por gugeldev/exercicios-bd-ptbr (CC0).
const IMAGE_BASE_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const exercises = (rawExercises as LibraryExercise[])
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

const exercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
const searchNames = new Map(exercises.map((exercise) => [exercise.id, normalizeText(exercise.name)]));

export function getLibraryExercise(id: string): LibraryExercise | undefined {
  return exercisesById.get(id);
}

export function imageUrl(path: string): string {
  return `${IMAGE_BASE_URL}${path}`;
}

interface ListOptions {
  group?: MuscleGroup;
  query?: string;
  /** Exercícios desses grupos vêm primeiro (ex.: grupos do dia do plano). */
  preferred?: MuscleGroup[];
  /** Restringe a lista a estes grupos. */
  onlyGroups?: MuscleGroup[];
}

export function listExercises({
  group,
  query = '',
  preferred = [],
  onlyGroups,
}: ListOptions): LibraryExercise[] {
  const normalizedQuery = normalizeText(query.trim());

  const matches = exercises.filter(
    (exercise) =>
      (group === undefined || exercise.group === group) &&
      (onlyGroups === undefined || onlyGroups.includes(exercise.group)) &&
      (normalizedQuery.length === 0 || searchNames.get(exercise.id)?.includes(normalizedQuery)),
  );

  if (preferred.length === 0) return matches;

  // Array.sort é estável: mantém a ordem alfabética dentro de cada bloco.
  return matches
    .slice()
    .sort((a, b) => Number(preferred.includes(b.group)) - Number(preferred.includes(a.group)));
}

export function countByGroup(): Map<MuscleGroup, number> {
  const counts = new Map<MuscleGroup, number>();
  for (const exercise of exercises) {
    counts.set(exercise.group, (counts.get(exercise.group) ?? 0) + 1);
  }
  return counts;
}

export const TOTAL_EXERCISES = exercises.length;
