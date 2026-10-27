import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBar, type TabItem } from '../shared/components/TabBar';
import { colors } from '../shared/theme';
import { ExerciseLibrary } from '../features/exercises/components/ExerciseLibrary';
import { PlanScreen } from '../features/plans/screens/PlanScreen';
import type { Plan, PlanDay } from '../features/plans/types';
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
  const insets = useSafeAreaInsets();
  const { sessions, addSession, removeSession, lastSetsFor } = useSessions();
  const [tab, setTab] = useState<Tab>('plan');
  const [training, setTraining] = useState<ActiveTraining | null>(null);

  const bottomInset = Math.max(insets.bottom, 12) + TAB_BAR_HEIGHT;

  // As abas ficam montadas (só escondidas) para manter plano, dia e busca ao trocar de aba.
  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, tab !== 'plan' && styles.hidden]}>
        <PlanScreen
          bottomInset={bottomInset}
          onStartTraining={(plan, day) => setTraining({ plan, day })}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hidden: {
    display: 'none',
  },
});
