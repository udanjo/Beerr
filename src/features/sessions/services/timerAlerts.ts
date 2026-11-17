import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { hasNotificationPermission } from '../../settings/services/expiryReminders';

const CHANNEL_ID = 'timer-alerts';

let channelReady = false;

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Fim de tempo e descanso',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 400, 200, 400],
  });
  channelReady = true;
}

/**
 * Agenda um aviso do sistema para o fim do cronômetro/descanso. Com o app em segundo plano ou a
 * tela bloqueada o JS não roda (o bip do app não toca), mas a notificação local do sistema toca
 * som e vibra. Em primeiro plano o handler não toca som, então não duplica com o bip do app.
 * Devolve o id para cancelar, ou `null` se não há permissão ou deu erro (o app segue sem aviso).
 */
export async function scheduleTimerAlert(seconds: number, title: string, body: string): Promise<string | null> {
  try {
    if (seconds < 1 || !(await hasNotificationPermission())) return null;
    await ensureChannel();
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true, data: { type: 'timer-alert' } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    return null;
  }
}

export function cancelTimerAlert(id: string | null): void {
  if (!id) return;
  Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  Notifications.dismissNotificationAsync(id).catch(() => undefined);
}
