import AsyncStorage from '@react-native-async-storage/async-storage';

import { markBackupDirty } from '../../backup/services/backupMeta';
import type { LibraryExercise } from './exerciseLibrary';

/** Exercícios criados pelo usuário, por conta, no mesmo formato dos da biblioteca. */
export const customExercisesKey = (uid: string) => `@beerr/u/${uid}/customExercises`;

export const CUSTOM_ID_PREFIX = 'custom-';

let activeUid: string | null = null;
let current: LibraryExercise[] = [];
const listeners = new Set<() => void>();

function sortByName(list: LibraryExercise[]): LibraryExercise[] {
  return list.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function emit(next: LibraryExercise[]) {
  current = next;
  listeners.forEach((listener) => listener());
}

export function subscribeCustomExercises(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** A referência só muda quando a lista muda (exigido por useSyncExternalStore). */
export function getCustomExercises(): LibraryExercise[] {
  return current;
}

export async function loadCustomExercises(uid: string): Promise<LibraryExercise[]> {
  try {
    const raw = await AsyncStorage.getItem(customExercisesKey(uid));
    return raw ? sortByName(JSON.parse(raw) as LibraryExercise[]) : [];
  } catch {
    return [];
  }
}

/** Carrega os exercícios da conta ativa; chamado ao abrir o app para a conta. */
export async function initCustomExercises(uid: string): Promise<void> {
  activeUid = uid;
  const loaded = await loadCustomExercises(uid);
  if (activeUid === uid) emit(loaded);
}

async function persist(next: LibraryExercise[]): Promise<void> {
  if (!activeUid) return;
  emit(next);
  await AsyncStorage.setItem(customExercisesKey(activeUid), JSON.stringify(next));
  markBackupDirty(activeUid).catch(() => undefined);
}

export function newCustomId(): string {
  return `${CUSTOM_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Cria (id novo) ou atualiza (id existente) um exercício personalizado. */
export function saveCustomExercise(exercise: LibraryExercise): Promise<void> {
  const exists = current.some((item) => item.id === exercise.id);
  const next = exists
    ? current.map((item) => (item.id === exercise.id ? exercise : item))
    : [...current, exercise];
  return persist(sortByName(next));
}

export function deleteCustomExercise(id: string): Promise<void> {
  return persist(current.filter((item) => item.id !== id));
}

/** Completa com https:// quando falta o esquema; devolve null se não parecer um link. */
export function normalizeVideoUrl(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  const url = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  return /^https?:\/\/[^\s/]+\.[^\s/]{2,}(\/\S*)?$/i.test(url) ? url : null;
}
