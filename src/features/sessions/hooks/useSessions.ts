import { useCallback, useEffect, useState } from 'react';

import { loadSessions, saveSessions } from '../services/sessionStorage';
import type { SessionSet, WorkoutSession } from '../types';

export function useSessions(uid: string) {
  // Mais recente primeiro.
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  useEffect(() => {
    loadSessions(uid)
      .then(setSessions)
      .catch(() => setSessions([]));
  }, [uid]);

  const addSession = useCallback(
    (session: WorkoutSession) => {
      const next = [session, ...sessions];
      setSessions(next);
      saveSessions(uid, next).catch(() => undefined);
    },
    [uid, sessions],
  );

  const removeSession = useCallback(
    (sessionId: string) => {
      const next = sessions.filter((session) => session.id !== sessionId);
      setSessions(next);
      saveSessions(uid, next).catch(() => undefined);
    },
    [uid, sessions],
  );

  /** Séries do treino mais recente em que o exercício foi feito. */
  const lastSetsFor = useCallback(
    (exerciseId: string): SessionSet[] | undefined => {
      for (const session of sessions) {
        const found = session.exercises.find((exercise) => exercise.exerciseId === exerciseId);
        if (found && found.sets.length > 0) return found.sets;
      }
      return undefined;
    },
    [sessions],
  );

  return { sessions, addSession, removeSession, lastSetsFor };
}
