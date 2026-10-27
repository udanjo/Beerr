import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import {
  DEFAULT_REPS,
  DEFAULT_WEIGHT,
  SetValueSheet,
  formatWeight,
} from '../../../shared/components/SetValueSheet';
import { colors, fontSize, fonts, radius } from '../../../shared/theme';
import { ExerciseDetailModal } from '../../exercises/components/ExerciseDetail';
import { ExerciseThumb } from '../../exercises/components/ExerciseThumb';
import type { Exercise, Plan, PlanDay } from '../../plans/types';
import { RestTimerBar } from '../components/RestTimerBar';
import { useRestTimer } from '../hooks/useRestTimer';
import type { SessionSet, WorkoutSession } from '../types';

interface WorkoutSessionScreenProps {
  plan: Plan;
  day: PlanDay;
  lastSetsFor: (exerciseId: string) => SessionSet[] | undefined;
  onFinish: (session: WorkoutSession) => void;
  onExit: () => void;
}

interface SetDraft {
  weight: number;
  reps: number;
  done: boolean;
}

interface ExerciseProgress {
  exercise: Exercise;
  sets: SetDraft[];
  /** Séries do último treino deste exercício, só para exibir. */
  previous: SessionSet[] | undefined;
}

function formatPrevious(sets: SessionSet[]): string {
  return sets.map((set) => `${set.reps}×${formatWeight(set.weight)}`).join(' · ');
}

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Usa o treino anterior (se houver) como ponto de partida; senão, o planejado (padrão 12 reps / 0 kg). */
function buildSets(exercise: Exercise, previous: SessionSet[] | undefined): SetDraft[] {
  return exercise.sets.map((planned, index) => {
    const last = previous?.[index] ?? previous?.[previous.length - 1];
    return {
      weight: last?.weight ?? planned.weight ?? DEFAULT_WEIGHT,
      reps: last?.reps || planned.reps || DEFAULT_REPS,
      done: false,
    };
  });
}

export function WorkoutSessionScreen({
  plan,
  day,
  lastSetsFor,
  onFinish,
  onExit,
}: WorkoutSessionScreenProps) {
  useKeepAwake();
  const insets = useSafeAreaInsets();

  const [startedAt] = useState(() => new Date().toISOString());
  const [now, setNow] = useState(() => Date.now());
  const [howToId, setHowToId] = useState<string | null>(null);
  const [items, setItems] = useState<ExerciseProgress[]>(() =>
    day.exercises.map((exercise) => {
      const previous = lastSetsFor(exercise.id);
      return { exercise, sets: buildSets(exercise, previous), previous };
    }),
  );
  // Cards com todas as séries feitas ficam recolhidos; aqui ficam os reabertos à mão.
  const [reopenedIds, setReopenedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ exerciseIndex: number; setIndex: number } | null>(null);
  const timer = useRestTimer();

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleReopened = (exerciseId: string) => {
    setReopenedIds((current) =>
      current.includes(exerciseId)
        ? current.filter((id) => id !== exerciseId)
        : [...current, exerciseId],
    );
  };

  const totalSets = items.reduce((sum, item) => sum + item.sets.length, 0);
  const doneSets = items.reduce((sum, item) => sum + item.sets.filter((s) => s.done).length, 0);
  const volume = items.reduce(
    (sum, item) =>
      sum + item.sets.reduce((acc, set) => (set.done ? acc + set.reps * set.weight : acc), 0),
    0,
  );
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));

  const updateSet = (exerciseIndex: number, setIndex: number, reps: number, weight: number) => {
    setItems((current) =>
      current.map((item, i) =>
        i !== exerciseIndex
          ? item
          : {
              ...item,
              // Série editada e as seguintes ainda não concluídas; séries feitas não mudam.
              sets: item.sets.map((set, j) =>
                j === setIndex || (j > setIndex && !set.done) ? { ...set, reps, weight } : set,
              ),
            },
      ),
    );
    setEditing(null);
  };

  const toggleDone = (exerciseIndex: number, setIndex: number) => {
    const next = items.map((item, i) =>
      i !== exerciseIndex
        ? item
        : {
            ...item,
            sets: item.sets.map((set, j) => (j === setIndex ? { ...set, done: !set.done } : set)),
          },
    );
    setItems(next);

    const justCompleted = next[exerciseIndex].sets[setIndex].done;
    if (justCompleted) Vibration.vibrate(20);
    const allDone = next.every((item) => item.sets.every((set) => set.done));
    if (justCompleted && !allDone) timer.start(next[exerciseIndex].exercise.restSeconds);
    if (allDone) timer.stop();
  };

  // Nova série repete a última do exercício.
  const addSet = (exerciseIndex: number) => {
    setItems((current) =>
      current.map((item, i) => {
        if (i !== exerciseIndex) return item;
        const last = item.sets[item.sets.length - 1];
        const base = last ?? { reps: DEFAULT_REPS, weight: DEFAULT_WEIGHT };
        return { ...item, sets: [...item.sets, { reps: base.reps, weight: base.weight, done: false }] };
      }),
    );
  };

  // Marcar todas não dispara o descanso: quem usa já terminou o exercício.
  const markAll = (exerciseIndex: number) => {
    setItems((current) =>
      current.map((item, i) =>
        i !== exerciseIndex
          ? item
          : { ...item, sets: item.sets.map((set) => ({ ...set, done: true })) },
      ),
    );
    timer.stop();
  };

  const finish = () => {
    const exercises = items
      .map(({ exercise, sets }) => ({
        exerciseId: exercise.id,
        name: exercise.name,
        libraryId: exercise.libraryId,
        sets: sets
          .filter((set) => set.done)
          .map((set) => ({ weight: set.weight, reps: set.reps })),
      }))
      .filter((exercise) => exercise.sets.length > 0);

    if (exercises.length === 0) {
      onExit();
      return;
    }

    onFinish({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      planId: plan.id,
      planName: plan.name,
      dayId: day.id,
      dayLabel: day.label,
      startedAt,
      finishedAt: new Date().toISOString(),
      exercises,
    });
  };

  const handleFinish = () => {
    if (doneSets === totalSets) {
      finish();
      return;
    }
    Alert.alert(
      'Finalizar treino',
      `Você fez ${doneSets} de ${totalSets} séries. Finalizar mesmo assim?`,
      [
        { text: 'Continuar treinando', style: 'cancel' },
        { text: 'Finalizar', onPress: finish },
      ],
    );
  };

  const handleExit = () => {
    if (doneSets === 0) {
      onExit();
      return;
    }
    Alert.alert('Sair do treino', 'O progresso deste treino será perdido.', [
      { text: 'Continuar treinando', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: onExit },
    ]);
  };

  const progress = totalSets > 0 ? doneSets / totalSets : 0;
  const editingItem = editing ? items[editing.exerciseIndex] : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={handleExit}
          style={styles.exitButton}
          accessibilityRole="button"
          accessibilityLabel="Sair do treino"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {day.label.toUpperCase()}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <View style={styles.statRow}>
            <View style={styles.liveDot} />
            <Text style={styles.statValue}>{formatElapsed(elapsedSeconds)}</Text>
          </View>
          <Text style={styles.statLabel}>Duração</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{Math.round(volume)}</Text>
          <Text style={styles.statLabel}>Volume (kg)</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {doneSets}/{totalSets}
          </Text>
          <Text style={styles.statLabel}>Séries</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, exerciseIndex) => {
          const allDone = item.sets.every((set) => set.done);
          const collapsed = allDone && !reopenedIds.includes(item.exercise.id);

          if (collapsed) {
            return (
              <Pressable
                key={item.exercise.id}
                onPress={() => toggleReopened(item.exercise.id)}
                style={styles.collapsedCard}
                accessibilityRole="button"
                accessibilityState={{ expanded: false }}
                accessibilityLabel={`${item.exercise.name} concluído. Toque para reabrir`}
              >
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={styles.collapsedName} numberOfLines={1}>
                  {item.exercise.name}
                </Text>
                <Text style={styles.collapsedMeta}>
                  {item.sets.length} {item.sets.length === 1 ? 'série' : 'séries'}
                </Text>
              </Pressable>
            );
          }

          return (
            <View key={item.exercise.id} style={styles.exercise}>
              <View style={styles.exerciseHeader}>
                <ExerciseThumb libraryId={item.exercise.libraryId} size={64} />
                <View style={styles.exerciseText}>
                  <Text style={styles.exerciseName} numberOfLines={2}>
                    {item.exercise.name}
                  </Text>
                  {item.previous && item.previous.length > 0 && (
                    <Text style={styles.previous} numberOfLines={1}>
                      Última vez: {formatPrevious(item.previous)}
                    </Text>
                  )}
                </View>
                {item.exercise.libraryId && (
                  <Pressable
                    onPress={() => setHowToId(item.exercise.libraryId ?? null)}
                    style={styles.howToButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Como fazer ${item.exercise.name}`}
                  >
                    <Ionicons name="play" size={16} color={colors.text} />
                  </Pressable>
                )}
              </View>

              {item.exercise.notes && (
                <View style={styles.noteBox}>
                  <Ionicons name="document-text-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.noteText}>{item.exercise.notes}</Text>
                </View>
              )}

              <View style={styles.setHeader}>
                <Text style={[styles.setHeaderText, styles.indexCol]}>SÉRIE</Text>
                <Text style={[styles.setHeaderText, styles.headerCol]}>REPS</Text>
                <Text style={[styles.setHeaderText, styles.headerCol]}>PESO (KG)</Text>
                <View style={styles.checkSpacer} />
              </View>

              {item.sets.map((set, setIndex) => (
                <View key={setIndex} style={[styles.setRow, set.done && styles.setRowDone]}>
                  <Text style={[styles.indexText, styles.indexCol]}>{setIndex + 1}</Text>
                  <Pressable
                    style={styles.valueCol}
                    onPress={() => setEditing({ exerciseIndex, setIndex })}
                    accessibilityRole="button"
                    accessibilityLabel={`Repetições da série ${setIndex + 1}: ${set.reps}. Toque para alterar`}
                  >
                    <Text style={styles.valueText}>{set.reps}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.valueCol}
                    onPress={() => setEditing({ exerciseIndex, setIndex })}
                    accessibilityRole="button"
                    accessibilityLabel={`Carga da série ${setIndex + 1}: ${formatWeight(set.weight)} quilos. Toque para alterar`}
                  >
                    <Text style={styles.valueText}>{formatWeight(set.weight)}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => toggleDone(exerciseIndex, setIndex)}
                    style={[styles.check, set.done && styles.checkDone]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: set.done }}
                    accessibilityLabel={`Série ${setIndex + 1} concluída`}
                  >
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={set.done ? colors.onPrimary : colors.textMuted}
                    />
                  </Pressable>
                </View>
              ))}

              <View style={styles.actions}>
                <Pressable
                  onPress={() => addSet(exerciseIndex)}
                  style={styles.actionButton}
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar série"
                >
                  <Ionicons name="add" size={20} color={colors.primary} />
                  <Text style={styles.addText}>ADICIONAR SÉRIE</Text>
                </Pressable>
                <Pressable
                  onPress={() => markAll(exerciseIndex)}
                  style={styles.actionButton}
                  accessibilityRole="button"
                  accessibilityLabel="Marcar todas as séries como concluídas"
                >
                  <Text style={styles.markText}>MARCAR TODAS</Text>
                  <Ionicons name="checkmark-done" size={20} color={colors.text} />
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {timer.isRunning && (
          <RestTimerBar
            remaining={timer.remaining}
            total={timer.total}
            onAddTime={timer.addTime}
            onSkip={timer.stop}
          />
        )}
        <PrimaryButton label="Finalizar treino" onPress={handleFinish} />
      </View>

      <ExerciseDetailModal libraryId={howToId} onClose={() => setHowToId(null)} />

      {editing && editingItem && (
        <SetValueSheet
          title={`${editingItem.exercise.name.toUpperCase()} (${editing.setIndex + 1}/${editingItem.sets.length})`}
          hint={
            editing.setIndex < editingItem.sets.length - 1
              ? 'Vale também para as próximas séries não concluídas'
              : undefined
          }
          reps={editingItem.sets[editing.setIndex].reps}
          weight={editingItem.sets[editing.setIndex].weight}
          onConfirm={(reps, weight) => updateSet(editing.exerciseIndex, editing.setIndex, reps, weight)}
          onClose={() => setEditing(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  exitButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: fontSize.xl,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statValue: {
    color: colors.text,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.lg,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
  },
  progressTrack: {
    height: 3,
    marginHorizontal: 16,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  exercise: {
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseText: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.lg,
    lineHeight: 22,
  },
  previous: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
  },
  howToButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  noteBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  noteText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  setHeaderText: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 14,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceAlt,
  },
  setRowDone: {
    borderColor: colors.primary,
  },
  indexCol: {
    width: 56,
    textAlign: 'center',
  },
  valueCol: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCol: {
    flex: 1,
  },
  checkSpacer: {
    width: 40,
    marginLeft: 8,
  },
  check: {
    width: 40,
    height: 40,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  checkDone: {
    backgroundColor: colors.primary,
  },
  indexText: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
  },
  valueText: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: fontSize.lg,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  addText: {
    color: colors.primary,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    letterSpacing: 0.4,
  },
  markText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    letterSpacing: 0.4,
  },
  collapsedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    marginVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  collapsedName: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
  },
  collapsedMeta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
    backgroundColor: colors.background,
  },
});
