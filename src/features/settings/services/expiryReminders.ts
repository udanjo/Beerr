import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { formatDateKey } from '../../plans/services/planExpiry';
import type { Plan } from '../../plans/types';

const CHANNEL_ID = 'plan-alerts';
const NOTIFICATION_TYPE = 'plan-expiry';
export const REMINDER_DAYS_BEFORE = 2;
export const REMINDER_HOUR = 9;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Avisos de plano',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/** Pede a permissão (Android 13+); o canal precisa existir antes para o aviso do sistema aparecer. */
export async function requestNotificationPermission(): Promise<boolean> {
  await ensureChannel();
  if (await hasNotificationPermission()) return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Dia do aviso: REMINDER_DAYS_BEFORE dias antes do vencimento, às 09:00 locais. */
function reminderDate(expiresAt: string): Date {
  const [year, month, day] = expiresAt.split('-').map(Number);
  return new Date(year, month - 1, day - REMINDER_DAYS_BEFORE, REMINDER_HOUR, 0, 0);
}

/**
 * Deixa agendado exatamente um aviso por plano com prazo futuro. Cancela os anteriores e
 * reagenda, então serve para qualquer mudança (prazo, plano apagado, app aberto de novo).
 * Avisos que cairiam no passado (prazo a menos de 2 dias) não são agendados.
 */
export async function syncExpiryReminders(plans: Plan[], enabled: boolean): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.type === NOTIFICATION_TYPE)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );

  if (!enabled || !(await hasNotificationPermission())) return;
  await ensureChannel();

  const now = Date.now();
  await Promise.all(
    plans.flatMap((plan) => {
      if (!plan.expiresAt) return [];
      const date = reminderDate(plan.expiresAt);
      if (date.getTime() <= now) return [];
      return [
        Notifications.scheduleNotificationAsync({
          content: {
            title: `Seu plano vence em ${REMINDER_DAYS_BEFORE} dias`,
            body: `O plano "${plan.name}" termina em ${formatDateKey(plan.expiresAt).slice(0, 5)}. Hora de renovar ou ajustar o treino.`,
            data: { type: NOTIFICATION_TYPE, planId: plan.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            channelId: CHANNEL_ID,
          },
        }),
      ];
    }),
  );
}

/** Id do plano de um aviso de vencimento tocado pelo usuário; `null` para outras notificações. */
export function planIdFromResponse(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data;
  return data?.type === NOTIFICATION_TYPE && typeof data.planId === 'string' ? data.planId : null;
}
