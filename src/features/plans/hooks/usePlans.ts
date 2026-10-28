import { useCallback, useEffect, useState } from 'react';

import { createId } from '../services/exerciseFactory';
import { loadPlans, savePlans } from '../services/planStorage';
import type { Exercise, NewPlan, Plan } from '../types';

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlans()
      .then(setPlans)
      .catch(() => setError('Não foi possível carregar os planos.'))
      .finally(() => setIsLoading(false));
  }, []);

  const persist = useCallback(async (next: Plan[]) => {
    setPlans(next);
    try {
      await savePlans(next);
      setError(null);
    } catch {
      setError('Não foi possível salvar os planos.');
    }
  }, []);

  const addPlan = useCallback(
    (input: NewPlan): string => {
      const plan: Plan = {
        id: createId(),
        name: input.name,
        expiresAt: input.expiresAt,
        createdAt: new Date().toISOString(),
        days: input.days.map((day) => ({ ...day, id: createId(), exercises: [] })),
      };
      persist([plan, ...plans]);
      return plan.id;
    },
    [plans, persist],
  );

  const removePlan = useCallback(
    (id: string) => persist(plans.filter((plan) => plan.id !== id)),
    [plans, persist],
  );

  const setPlanExpiry = useCallback(
    (planId: string, expiresAt: string | undefined) =>
      persist(plans.map((plan) => (plan.id === planId ? { ...plan, expiresAt } : plan))),
    [plans, persist],
  );

  const setDayExercises = useCallback(
    (planId: string, dayId: string, exercises: Exercise[]) =>
      persist(
        plans.map((plan) =>
          plan.id === planId
            ? {
                ...plan,
                days: plan.days.map((day) => (day.id === dayId ? { ...day, exercises } : day)),
              }
            : plan,
        ),
      ),
    [plans, persist],
  );

  return { plans, isLoading, error, addPlan, removePlan, setPlanExpiry, setDayExercises };
}
