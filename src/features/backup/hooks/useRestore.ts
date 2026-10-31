import { useCallback, useEffect, useState } from 'react';

import { loadPlans } from '../../plans/services/planStorage';
import { loadSessions } from '../../sessions/services/sessionStorage';
import { loadBackupMeta, updateBackupMeta } from '../services/backupMeta';
import { restoreFromCloud } from '../services/cloudBackup';

export type RestoreState = 'checking' | 'restoring' | 'failed' | 'done';

/**
 * Aparelho sem dados desta conta: busca da nuvem antes de abrir o app. Com dados locais, não
 * restaura nada (nunca sobrescreve o que já está aqui) e libera o backup.
 */
export function useRestore(uid: string, enabled: boolean) {
  const [state, setState] = useState<RestoreState>(enabled ? 'checking' : 'done');

  const run = useCallback(async () => {
    setState('checking');
    const meta = await loadBackupMeta(uid);
    if (meta.restoreDone) {
      setState('done');
      return;
    }
    const [plans, sessions] = await Promise.all([loadPlans(uid), loadSessions(uid)]);
    if (plans.length > 0 || sessions.length > 0) {
      await updateBackupMeta(uid, (current) => ({ ...current, restoreDone: true }));
      setState('done');
      return;
    }
    setState('restoring');
    try {
      await restoreFromCloud(uid);
      setState('done');
    } catch {
      setState('failed');
    }
  }, [uid]);

  useEffect(() => {
    if (enabled) run();
  }, [enabled, run]);

  /** O backup nunca apaga o que não enviou, então seguir sem restaurar não ameaça os dados da nuvem. */
  const skip = useCallback(async () => {
    await updateBackupMeta(uid, (current) => ({ ...current, restoreDone: true }));
    setState('done');
  }, [uid]);

  return { state, retry: run, skip };
}
