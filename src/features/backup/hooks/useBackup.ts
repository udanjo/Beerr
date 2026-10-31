import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { loadBackupMeta, subscribeBackupMeta, updateBackupMeta, type BackupMeta } from '../services/backupMeta';
import { networkKind, runBackup } from '../services/cloudBackup';

export type BackupResult = 'ok' | 'no-wifi' | 'error' | 'busy';

const RETRY_INTERVAL_MS = 60000;
const DEBOUNCE_MS = 4000;
const ATTENTION_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * Envia o backup em segundo plano quando há Wi-Fi. O treino nunca depende disto:
 * qualquer falha só fica registrada e é tentada de novo depois.
 */
export function useBackup(uid: string, enabled: boolean) {
  const [meta, setMeta] = useState<BackupMeta | null>(null);
  const [syncing, setSyncing] = useState(false);
  const running = useRef(false);
  const lastRev = useRef(-1);

  useEffect(() => {
    loadBackupMeta(uid).then(setMeta);
    return subscribeBackupMeta((changedUid, next) => {
      if (changedUid === uid) setMeta(next);
    });
  }, [uid]);

  const backupNow = useCallback(
    async (allowMobile = false): Promise<BackupResult> => {
      if (!enabled || running.current) return 'busy';
      const kind = await networkKind();
      if (kind === 'none' || (kind === 'mobile' && !allowMobile)) return 'no-wifi';

      running.current = true;
      setSyncing(true);
      try {
        await runBackup(uid);
        return 'ok';
      } catch {
        await updateBackupMeta(uid, (current) => ({
          ...current,
          lastError: 'Não foi possível enviar o backup.',
        }));
        return 'error';
      } finally {
        running.current = false;
        setSyncing(false);
      }
    },
    [uid, enabled],
  );

  const autoBackup = useCallback(async () => {
    const current = await loadBackupMeta(uid);
    if (current.restoreDone && current.dirty) await backupNow(false);
  }, [uid, backupNow]);

  useEffect(() => {
    if (!enabled) return;
    let debounce: ReturnType<typeof setTimeout> | undefined;

    autoBackup();
    const interval = setInterval(autoBackup, RETRY_INTERVAL_MS);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') autoBackup();
    });
    // Só uma mudança nos dados (rev nova) agenda um envio; erros não criam laço de tentativas.
    const unsubscribe = subscribeBackupMeta((changedUid, next) => {
      if (changedUid !== uid || next.rev === lastRev.current) return;
      lastRev.current = next.rev;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(autoBackup, DEBOUNCE_MS);
    });

    return () => {
      if (debounce) clearTimeout(debounce);
      clearInterval(interval);
      appState.remove();
      unsubscribe();
    };
  }, [enabled, uid, autoBackup]);

  const pending = Boolean(meta?.dirty);
  // Pendência normal é o estado comum; só vira alerta depois de 24 h ou com erro.
  const needsAttention =
    Boolean(meta?.lastError) ||
    (pending && meta?.dirtySince !== undefined && Date.now() - new Date(meta.dirtySince).getTime() > ATTENTION_AFTER_MS);

  return {
    lastBackupAt: meta?.lastBackupAt,
    lastError: meta?.lastError,
    pending,
    syncing,
    needsAttention,
    backupNow,
  };
}
