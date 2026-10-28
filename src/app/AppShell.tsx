import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBar, type TabItem } from '../shared/components/TabBar';
import { type Palette } from '../shared/theme';
import { useThemedStyles } from '../shared/theme/ThemeContext';
import { ExerciseLibrary } from '../features/exercises/components/ExerciseLibrary';
import { PlanScreen } from '../features/plans/screens/PlanScreen';
import type { Plan, PlanDay } from '../features/plans/types';
import { useSettings } from '../features/settings/hooks/useSettings';
import { SettingsScreen } from '../features/settings/screens/SettingsScreen';
import { planIdFromResponse } from '../features/settings/services/expiryReminders';
import { useSessions } from '../features/sessions/hooks/useSessions';
import { HistoryScreen } from '../features/sessions/screens/HistoryScreen';
import { ProgressScreen } from '../features/sessions/screens/ProgressScreen';
import { WorkoutSessionScreen } from '../features/sessions/screens/WorkoutSessionScreen';

type Tab = 'plan' | 'history' | 'progress' | 'library';

const TABS: TabItem<Tab>[] = [
  { value: 'plan', label: 'Meu plano', icon: 'barbell' },
  { value: 'history', label: 'Treinos', icon: 'calendar' },
  { value: 'progress', label: 'Progresso', icon: 'stats-chart' },
  { value: 'library', label: 'Exercícios', icon: 'body' },
];

const TAB_BAR_HEIGHT = 72;

interface ActiveTraining {
  plan: Plan;
  day: PlanDay;
}

export function AppShell() {
  const { styles } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { sessions, addSession, removeSession, lastSetsFor } = useSessions();
  const [tab, setTab] = useState<Tab>('plan');
  const [training, setTraining] = useState<ActiveTraining | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ planId: string; nonce: number } | null>(null);
  const { notifyExpiry, permissionDenied, setNotifyExpiry } = useSettings();

  // Toque no aviso de vencimento: abre "Meu plano" na lista de planos. Não interrompe um treino.
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponse = useRef<string | null>(null);
  useEffect(() => {
    if (!lastResponse || training) return;
    const key = `${lastResponse.notification.request.identifier}:${lastResponse.notification.date}`;
    const planId = planIdFromResponse(lastResponse);
    if (!planId || handledResponse.current === key) return;
    handledResponse.current = key;
    setSettingsOpen(false);
    setTab('plan');
    setFocusRequest((current) => ({ planId, nonce: (current?.nonce ?? 0) + 1 }));
  }, [lastResponse, training]);

  const bottomInset = Math.max(insets.bottom, 12) + TAB_BAR_HEIGHT;

  // As abas ficam montadas (só escondidas) para manter plano, dia e busca ao trocar de aba.
  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, tab !== 'plan' && styles.hidden]}>
        <PlanScreen
          bottomInset={bottomInset}
          onStartTraining={(plan, day) => setTraining({ plan, day })}
          onOpenSettings={() => setSettingsOpen(true)}
          remindersEnabled={notifyExpiry}
          focusRequest={focusRequest}
        />
      </View>
      <View style={[StyleSheet.absoluteFill, tab !== 'history' && styles.hidden]}>
        <HistoryScreen sessions={sessions} bottomInset={bottomInset} onDelete={removeSession} />
      </View>
      <View style={[StyleSheet.absoluteFill, tab !== 'progress' && styles.hidden]}>
        <ProgressScreen sessions={sessions} bottomInset={bottomInset} />
      </View>
      <View
        style={[
          StyleSheet.absoluteFill,
          { paddingTop: insets.top },
          tab !== 'library' && styles.hidden,
        ]}
      >
        <ExerciseLibrary title="Exercícios" bottomPadding={bottomInset} />
      </View>

      <TabBar tabs={TABS} value={tab} onChange={setTab} />

      {settingsOpen && (
        <View style={StyleSheet.absoluteFill}>
          <SettingsScreen
            notifyExpiry={notifyExpiry}
            permissionDenied={permissionDenied}
            onToggleNotifyExpiry={setNotifyExpiry}
            onClose={() => setSettingsOpen(false)}
          />
        </View>
      )}

      {training && (
        <View style={StyleSheet.absoluteFill}>
          <WorkoutSessionScreen
            plan={training.plan}
            day={training.day}
            lastSetsFor={lastSetsFor}
            onFinish={(session) => {
              addSession(session);
              setTraining(null);
              setTab('history');
            }}
            onExit={() => setTraining(null)}
          />
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hidden: {
    display: 'none',
  },
  });
