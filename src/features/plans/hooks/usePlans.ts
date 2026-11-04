import { useCallback, useEffect, useState } from 'react';

import { createId } from '../services/exerciseFactory';
import { loadPlans, savePlans } from '../services/planStorage';
import type { Exercise, NewPlan, Plan, PlanDay } from '../types';

export function usePlans(uid: string) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlans(uid)
      .then(setPlans)
      .catch(() => setError('Não foi possível carregar os planos.'))
      .finally(() => setIsLoading(false));
  }, [uid]);

  const persist = useCallback(
    async (next: Plan[]) => {
      setPlans(next);
      try {
        await savePlans(uid, next);
        setError(null);
      } catch {
        setError('Não foi possível salvar os planos.');
      }
    },
    [uid],
  );

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

  /** Grava um plano já montado (ex.: gerado pelo questionário) e devolve o id. */
  const addFullPlan = useCallback(
    (plan: Plan): string => {
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

  const mapDays = useCallback(
    (planId: string, change: (days: PlanDay[]) => PlanDay[]) =>
      persist(plans.map((plan) => (plan.id === planId ? { ...plan, days: change(plan.days) } : plan))),
    [plans, persist],
  );

  /** Acrescenta um treino vazio ao plano e devolve o id dele. */
  const addDay = useCallback(
    (planId: string, label: string): string => {
      const day: PlanDay = { id: createId(), label, muscleGroups: [], exercises: [] };
      mapDays(planId, (days) => [...days, day]);
      return day.id;
    },
    [mapDays],
  );

  const updateDay = useCallback(
    (planId: string, dayId: string, changes: Pick<PlanDay, 'label' | 'muscleGroups'>) =>
      mapDays(planId, (days) => days.map((day) => (day.id === dayId ? { ...day, ...changes } : day))),
    [mapDays],
  );

  const removeDay = useCallback(
    (planId: string, dayId: string) =>
      mapDays(planId, (days) => (days.length > 1 ? days.filter((day) => day.id !== dayId) : days)),
    [mapDays],
  );

  return {
    plans,
    isLoading,
    error,
    addPlan,
    addFullPlan,
    removePlan,
    setPlanExpiry,
    setDayExercises,
    addDay,
    updateDay,
    removeDay,
  };
}
