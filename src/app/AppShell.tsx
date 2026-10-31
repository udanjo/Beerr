import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBar, type TabItem } from '../shared/components/TabBar';
import { type Palette } from '../shared/theme';
import { useThemedStyles } from '../shared/theme/ThemeContext';
import { ExerciseLibrary } from '../features/exercises/components/ExerciseLibrary';
import { PlanScreen } from '../features/plans/screens/PlanScreen';
import type { Exercise, Plan, PlanDay } from '../features/plans/types';
import { useSettings } from '../features/settings/hooks/useSettings';
import { SettingsScreen, type AccountInfo } from '../features/settings/screens/SettingsScreen';
import { useBackup } from '../features/backup/hooks/useBackup';
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

export interface PlanUpdateRequest {
  planId: string;
  dayId: string;
  exercises: Exercise[];
  nonce: number;
}

interface ActiveTraining {
  plan: Plan;
  day: PlanDay;
}

interface AppShellProps {
  /** Conta dona dos dados (chave de armazenamento). */
  uid: string;
  /** Há conta e backup na nuvem neste build. */
  cloud: boolean;
  email: string | null;
  onSignOut: () => Promise<void>;
}

export function AppShell({ uid, cloud, email, onSignOut }: AppShellProps) {
  const { styles } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { sessions, addSession, removeSession, lastSetsFor } = useSessions(uid);
  const backup = useBackup(uid, cloud);
  const [tab, setTab] = useState<Tab>('plan');
  const [training, setTraining] = useState<ActiveTraining | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ planId: string; nonce: number } | null>(null);
  const [planUpdate, setPlanUpdate] = useState<PlanUpdateRequest | null>(null);
  const {
    notifyExpiry,
    permissionDenied,
    setNotifyExpiry,
    allowEditDuringWorkout,
    setAllowEditDuringWorkout,
  } = useSettings();

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

  const handleBackupNow = async () => {
    const result = await backup.backupNow(false);
    if (result === 'no-wifi') {
      Alert.alert('Sem Wi-Fi', 'Enviar o backup mesmo assim, usando dados móveis?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            if ((await backup.backupNow(true)) === 'error') {
              Alert.alert('Backup', 'Não foi possível enviar agora. Tentaremos de novo mais tarde.');
            }
          },
        },
      ]);
    } else if (result === 'error') {
      Alert.alert('Backup', 'Não foi possível enviar agora. Tentaremos de novo mais tarde.');
    }
  };

  const handleSignOut = () => {
    if (!backup.pending) {
      Alert.alert('Sair da conta', 'Seus dados continuam salvos na nuvem e neste aparelho.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => onSignOut() },
      ]);
      return;
    }
    Alert.alert('Há dados não enviados', 'Se sair agora, eles ficam só neste aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Enviar e sair',
        onPress: async () => {
          const result = await backup.backupNow(false);
          if (result === 'ok') await onSignOut();
          else Alert.alert('Backup', 'Não foi possível enviar agora (é preciso Wi-Fi). Você continua na conta.');
        },
      },
      { text: 'Sair mesmo assim', style: 'destructive', onPress: () => onSignOut() },
    ]);
  };

  const account: AccountInfo | null = cloud
    ? {
        email,
        lastBackupAt: backup.lastBackupAt,
        pending: backup.pending,
        syncing: backup.syncing,
        error: backup.lastError,
        onBackupNow: handleBackupNow,
        onSignOut: handleSignOut,
      }
    : null;

  // As abas ficam montadas (só escondidas) para manter plano, dia e busca ao trocar de aba.
  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, tab !== 'plan' && styles.hidden]}>
        <PlanScreen
          uid={uid}
          backupAttention={backup.needsAttention}
          bottomInset={bottomInset}
          onStartTraining={(plan, day) => setTraining({ plan, day })}
          onOpenSettings={() => setSettingsOpen(true)}
          remindersEnabled={notifyExpiry}
          focusRequest={focusRequest}
          planUpdate={planUpdate}
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
            account={account}
            notifyExpiry={notifyExpiry}
            permissionDenied={permissionDenied}
            onToggleNotifyExpiry={setNotifyExpiry}
            allowEditDuringWorkout={allowEditDuringWorkout}
            onToggleAllowEdit={setAllowEditDuringWorkout}
            onClose={() => setSettingsOpen(false)}
          />
        </View>
      )}

      {training && (
        <View style={StyleSheet.absoluteFill}>
          <WorkoutSessionScreen
            plan={training.plan}
            day={training.day}
            allowEdit={allowEditDuringWorkout}
            lastSetsFor={lastSetsFor}
            onUpdatePlan={(exercises) =>
              setPlanUpdate((current) => ({
                planId: training.plan.id,
                dayId: training.day.id,
                exercises,
                nonce: (current?.nonce ?? 0) + 1,
              }))
            }
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
