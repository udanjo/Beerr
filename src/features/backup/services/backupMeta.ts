import AsyncStorage from '@react-native-async-storage/async-storage';

/** Estado do backup de uma conta neste aparelho. */
export interface BackupMeta {
  /** Sobe a cada mudança nos dados; o backup só limpa `dirty` se ninguém mudou durante o envio. */
  rev: number;
  /** Há dados locais ainda não enviados. */
  dirty: boolean;
  dirtySince?: string;
  lastBackupAt?: string;
  lastError?: string;
  /** A restauração inicial (ou a decisão de pulá-la) já aconteceu; antes disso não há backup. */
  restoreDone: boolean;
  /** Ids já gravados na nuvem, para enviar só o que é novo e apagar o que foi removido. */
  syncedPlanIds: string[];
  syncedSessionIds: string[];
}

const EMPTY: BackupMeta = {
  rev: 0,
  dirty: false,
  restoreDone: false,
  syncedPlanIds: [],
  syncedSessionIds: [],
};

const metaKey = (uid: string) => `@beerr/u/${uid}/backup`;

type Listener = (uid: string, meta: BackupMeta) => void;
const listeners = new Set<Listener>();
// Leituras e gravações do estado passam por uma fila para não se atropelarem.
let queue: Promise<unknown> = Promise.resolve();

export function subscribeBackupMeta(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function loadBackupMeta(uid: string): Promise<BackupMeta> {
  try {
    const raw = await AsyncStorage.getItem(metaKey(uid));
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<BackupMeta>) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export function updateBackupMeta(
  uid: string,
  change: (current: BackupMeta) => BackupMeta,
): Promise<BackupMeta> {
  const run = queue.then(async () => {
    const next = change(await loadBackupMeta(uid));
    await AsyncStorage.setItem(metaKey(uid), JSON.stringify(next));
    listeners.forEach((listener) => listener(uid, next));
    return next;
  });
  queue = run.catch(() => undefined);
  return run;
}

export function markBackupDirty(uid: string): Promise<BackupMeta> {
  return updateBackupMeta(uid, (meta) => ({
    ...meta,
    rev: meta.rev + 1,
    dirty: true,
    dirtySince: meta.dirty ? meta.dirtySince : new Date().toISOString(),
  }));
}
