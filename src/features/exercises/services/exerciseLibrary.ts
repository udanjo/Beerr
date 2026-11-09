import type { MuscleGroup } from '../../plans/types';
import rawExercises from '../data/exercises.json';
import { getCustomExercises } from './customExercises';

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
  /** Exercício criado pelo usuário (fora da base). */
  custom?: boolean;
  /** Link opcional do vídeo (só exercícios personalizados). */
  videoUrl?: string;
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
  return exercisesById.get(id) ?? getCustomExercises().find((exercise) => exercise.id === id);
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

  // Os personalizados vêm primeiro, para o usuário achar o que criou.
  const matches = [...getCustomExercises(), ...exercises].filter(
    (exercise) =>
      (group === undefined || exercise.group === group) &&
      (onlyGroups === undefined || onlyGroups.includes(exercise.group)) &&
      (normalizedQuery.length === 0 ||
        (searchNames.get(exercise.id) ?? normalizeText(exercise.name)).includes(normalizedQuery)),
  );

  if (preferred.length === 0) return matches;

  // Array.sort é estável: mantém a ordem alfabética dentro de cada bloco.
  return matches
    .slice()
    .sort((a, b) => Number(preferred.includes(b.group)) - Number(preferred.includes(a.group)));
}

export interface Suggestion {
  exercise: LibraryExercise;
  /** Por que é parecido, em texto curto (ex.: "Mesmo músculo · Halteres"). */
  reason: string;
}

/**
 * Alternativas parecidas, por regras locais e sem sorteio: mesmo grupo muscular, ordenadas por
 * mesmo músculo principal + mesmo equipamento, depois mesmo músculo, depois músculos secundários
 * em comum e nível. Vazio se o exercício não for da biblioteca.
 */
export function suggestSimilar(libraryId: string, excludeIds: string[] = [], limit = 3): Suggestion[] {
  const base = getLibraryExercise(libraryId);
  if (!base) return [];

  return [...getCustomExercises(), ...exercises]
    .filter(
      (candidate) =>
        candidate.group === base.group && candidate.id !== base.id && !excludeIds.includes(candidate.id),
    )
    .map((candidate) => ({
      candidate,
      sameTarget: candidate.target === base.target,
      sameEquipment: candidate.equipment !== null && candidate.equipment === base.equipment,
      shared: candidate.secondary.filter((muscle) => base.secondary.includes(muscle)).length,
      sameLevel: candidate.level === base.level,
    }))
    .sort(
      (a, b) =>
        Number(b.sameTarget) - Number(a.sameTarget) ||
        Number(b.sameEquipment) - Number(a.sameEquipment) ||
        b.shared - a.shared ||
        Number(b.sameLevel) - Number(a.sameLevel) ||
        a.candidate.name.localeCompare(b.candidate.name, 'pt-BR'),
    )
    .slice(0, limit)
    .map(({ candidate, sameTarget, sameEquipment }) => ({
      exercise: candidate,
      reason: sameTarget
        ? sameEquipment && candidate.equipment
          ? `Mesmo músculo · ${candidate.equipment}`
          : 'Mesmo músculo · outro equipamento'
        : `Mesmo grupo · ${candidate.target}`,
    }));
}

export function countByGroup():Map<MuscleGroup, number> {
  const counts = new Map<MuscleGroup, number>();
  for (const exercise of [...getCustomExercises(), ...exercises]) {
    counts.set(exercise.group, (counts.get(exercise.group) ?? 0) + 1);
  }
  return counts;
}

export const TOTAL_EXERCISES = exercises.length;
