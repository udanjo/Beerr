import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import * as Network from 'expo-network';

import { getFirebaseFirestore } from '../../../shared/firebase/firebase';
import { loadPlans, plansKey } from '../../plans/services/planStorage';
import type { Plan } from '../../plans/types';
import { loadSessions, sessionsKey } from '../../sessions/services/sessionStorage';
import type { WorkoutSession } from '../../sessions/types';
import { loadBackupMeta, updateBackupMeta } from './backupMeta';

const TIMEOUT_MS = 30000;
const BATCH_SIZE = 400;

/** Sem rede, as gravações do Firestore ficam esperando para sempre; o tempo limite evita travar. */
function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** O Firestore recusa `undefined`; passar por JSON remove esses campos. */
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function requireDb() {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('firebase-not-configured');
  return db;
}

export type NetworkKind = 'wifi' | 'mobile' | 'none';

export async function networkKind(): Promise<NetworkKind> {
  try {
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected) return 'none';
    return state.type === Network.NetworkStateType.WIFI ? 'wifi' : 'mobile';
  } catch {
    return 'none';
  }
}

type Operation = (batch: ReturnType<typeof writeBatch>) => void;

/** Envia o que mudou: planos sempre (são poucos), treinos só os novos, e apaga o que foi removido. */
export async function runBackup(uid: string): Promise<void> {
  const db = requireDb();
  const startRev = (await loadBackupMeta(uid)).rev;
  const [plans, sessions, meta] = await Promise.all([
    loadPlans(uid),
    loadSessions(uid),
    loadBackupMeta(uid),
  ]);

  const planIds = new Set(plans.map((plan) => plan.id));
  const sessionIds = new Set(sessions.map((session) => session.id));
  const syncedSessions = new Set(meta.syncedSessionIds);

  const operations: Operation[] = [];
  const base = ['users', uid] as const;

  for (const plan of plans) {
    operations.push((batch) => batch.set(doc(db, ...base, 'plans', plan.id), clean(plan)));
  }
  for (const session of sessions) {
    if (syncedSessions.has(session.id)) continue;
    operations.push((batch) => batch.set(doc(db, ...base, 'sessions', session.id), clean(session)));
  }
  for (const id of meta.syncedPlanIds) {
    if (!planIds.has(id)) operations.push((batch) => batch.delete(doc(db, ...base, 'plans', id)));
  }
  for (const id of meta.syncedSessionIds) {
    if (!sessionIds.has(id)) operations.push((batch) => batch.delete(doc(db, ...base, 'sessions', id)));
  }

  for (let start = 0; start < operations.length; start += BATCH_SIZE) {
    const batch = writeBatch(db);
    operations.slice(start, start + BATCH_SIZE).forEach((operation) => operation(batch));
    await withTimeout(batch.commit());
  }

  await updateBackupMeta(uid, (current) => ({
    ...current,
    // Se algo mudou durante o envio, continua pendente para o próximo ciclo.
    dirty: current.rev !== startRev,
    dirtySince: current.rev !== startRev ? current.dirtySince : undefined,
    lastBackupAt: new Date().toISOString(),
    lastError: undefined,
    syncedPlanIds: [...planIds],
    syncedSessionIds: [...sessionIds],
  }));
}

/** Baixa planos e treinos da nuvem para um aparelho sem dados. */
export async function restoreFromCloud(uid: string): Promise<void> {
  const db = requireDb();
  const [planDocs, sessionDocs] = await withTimeout(
    Promise.all([
      getDocs(collection(db, 'users', uid, 'plans')),
      getDocs(collection(db, 'users', uid, 'sessions')),
    ]),
  );

  const plans = planDocs.docs
    .map((snapshot) => snapshot.data() as Plan)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sessions = sessionDocs.docs
    .map((snapshot) => snapshot.data() as WorkoutSession)
    .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));

  // Grava direto no armazenamento (sem marcar como pendente: já está na nuvem).
  await AsyncStorage.multiSet([
    [plansKey(uid), JSON.stringify(plans)],
    [sessionsKey(uid), JSON.stringify(sessions)],
  ]);
  await updateBackupMeta(uid, (current) => ({
    ...current,
    restoreDone: true,
    dirty: false,
    dirtySince: undefined,
    lastBackupAt: new Date().toISOString(),
    lastError: undefined,
    syncedPlanIds: plans.map((plan) => plan.id),
    syncedSessionIds: sessions.map((session) => session.id),
  }));
}
