import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import {
  DEFAULT_REPS,
  DEFAULT_WEIGHT,
  SetValueSheet,
  formatWeight,
} from '../../../shared/components/SetValueSheet';
import { fontSize, fonts, radius, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import { ExerciseDetailModal } from '../../exercises/components/ExerciseDetail';
import { ExerciseThumb } from '../../exercises/components/ExerciseThumb';
import { useExerciseName } from '../../exercises/hooks/useCustomExercises';
import { getLibraryExercise } from '../../exercises/services/exerciseLibrary';
import { ExerciseLibrary } from '../../exercises/components/ExerciseLibrary';
import type { LibraryExercise } from '../../exercises/services/exerciseLibrary';
import { createExerciseFromLibrary } from '../../plans/services/exerciseFactory';
import {
  DEFAULT_SECONDS,
  displayDayLabel,
  formatSeconds,
  type Exercise,
  type Plan,
  type PlanDay,
} from '../../plans/types';
import { RestTimerBar } from '../components/RestTimerBar';
import { useRestTimer } from '../hooks/useRestTimer';
import { useSetTimer, type SetTimerTarget } from '../hooks/useSetTimer';
import {
  saveWorkoutDraft,
  type ExerciseProgress,
  type SetDraft,
  type WorkoutDraft,
} from '../services/workoutDraft';
import type { SessionSet, WorkoutSession } from '../types';

interface WorkoutSessionScreenProps {
  uid: string;
  /** Treino retomado após o app ter sido fechado. */
  initialDraft?: WorkoutDraft;
  plan: Plan;
  day: PlanDay;
  /** Configuração: permite trocar/adicionar exercícios durante o treino. */
  allowEdit: boolean;
  /** Configuração: avisos de motivação (ex.: aumento de peso). */
  motivation: boolean;
  lastSetsFor: (exerciseId: string, timed?: boolean, unilateral?: boolean) => SessionSet[] | undefined;
  onFinish: (session: WorkoutSession) => void;
  /** Grava no plano de origem a lista de exercícios do dia como ficou no treino. */
  onUpdatePlan: (exercises: Exercise[]) => void;
  onExit: () => void;
}

const CELEBRATION_TEXT = 'Você aumentou o peso! Parabéns!';

type PickerState = { mode: 'add' } | { mode: 'replace'; index: number };

function pluralExercises(count: number): string {
  return `${count} ${count === 1 ? 'exercício' : 'exercícios'}`;
}

function formatPrevious(sets: SessionSet[], timed?: boolean): string {
  if (timed) {
    return sets
      .map((set) =>
        set.weight > 0 ? `${formatSeconds(set.reps)}×${formatWeight(set.weight)}` : formatSeconds(set.reps),
      )
      .join(' · ');
  }
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
      reps: last?.reps || planned.reps || (exercise.timed ? DEFAULT_SECONDS : DEFAULT_REPS),
      done: false,
    };
  });
}

export function WorkoutSessionScreen({
  uid,
  initialDraft,
  plan,
  day,
  allowEdit,
  motivation,
  lastSetsFor,
  onFinish,
  onUpdatePlan,
  onExit,
}: WorkoutSessionScreenProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const nameOf = useExerciseName();
  useKeepAwake();
  const insets = useSafeAreaInsets();

  const [startedAt] = useState(() => initialDraft?.startedAt ?? new Date().toISOString());
  const [now, setNow] = useState(() => Date.now());
  const [howToId, setHowToId] = useState<string | null>(null);
  const [items, setItems] = useState<ExerciseProgress[]>(
    () =>
      initialDraft?.items ??
      day.exercises.map((exercise) => {
        const previous = lastSetsFor(exercise.id, exercise.timed, exercise.unilateral);
        return { exercise, sets: buildSets(exercise, previous), previous };
      }),
  );
  // Exercícios que já geraram o aviso de aumento de peso (uma vez por exercício no treino).
  const [celebratedIds, setCelebratedIds] = useState<string[]>(() => initialDraft?.celebratedIds ?? []);
  const [celebration, setCelebration] = useState<number | null>(null);
  const celebrationAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (celebration === null) return;
    AccessibilityInfo.announceForAccessibility(CELEBRATION_TEXT);
    celebrationAnim.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(celebrationAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2100),
      Animated.timing(celebrationAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => {
      if (finished) setCelebration(null);
    });
    return () => animation.stop();
  }, [celebration, celebrationAnim]);
  // Cards com todas as séries feitas ficam recolhidos; aqui ficam os reabertos à mão.
  const [reopenedIds, setReopenedIds] = useState<string[]>(() => initialDraft?.reopenedIds ?? []);

  // Cada mudança é guardada no aparelho: se o app fechar, o treino volta como estava.
  useEffect(() => {
    saveWorkoutDraft(uid, { plan, day, startedAt, items, reopenedIds, celebratedIds });
  }, [uid, plan, day, startedAt, items, reopenedIds, celebratedIds]);
  const [editing, setEditing] = useState<{ exerciseIndex: number; setIndex: number } | null>(null);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const timer = useRestTimer();
  // Série por tempo: ao zerar, marca a série como feita (o que também inicia o descanso).
  const setTimer = useSetTimer((target) => {
    const index = items.findIndex((item) => item.exercise.id === target.exerciseId);
    if (index >= 0 && !items[index].sets[target.setIndex]?.done) toggleDone(index, target.setIndex);
  });
  const isTimerOn = (exerciseId: string, setIndex: number) =>
    setTimer.target?.exerciseId === exerciseId && setTimer.target.setIndex === setIndex;

  const startSetTimer = (target: SetTimerTarget, seconds: number) => {
    timer.stop();
    setTimer.start(target, seconds);
  };

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
      item.exercise.timed
        ? sum
        : sum + item.sets.reduce((acc, set) => (set.done ? acc + set.reps * set.weight : acc), 0),
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
    if (isTimerOn(items[exerciseIndex].exercise.id, setIndex)) setTimer.cancel();
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
    // Ao concluir a última série, o card volta a recolher mesmo que tenha sido reaberto à mão.
    if (justCompleted && next[exerciseIndex].sets.every((set) => set.done)) {
      const finishedId = next[exerciseIndex].exercise.id;
      setReopenedIds((current) => current.filter((id) => id !== finishedId));
    }
    // Aviso de progressão: peso maior que o da mesma série no último treino (mesmo modo), 1x por exercício.
    const progressed = next[exerciseIndex];
    const previousSets = items[exerciseIndex].previous;
    const previousSet = previousSets?.[setIndex] ?? previousSets?.[previousSets.length - 1];
    const celebrate =
      motivation &&
      justCompleted &&
      !progressed.exercise.timed &&
      previousSet !== undefined &&
      progressed.sets[setIndex].weight > previousSet.weight &&
      !celebratedIds.includes(progressed.exercise.id);
    if (celebrate) {
      setCelebratedIds((current) => [...current, progressed.exercise.id]);
      setCelebration(Date.now());
    }
    if (justCompleted) Vibration.vibrate(celebrate ? 40 : 20);
    const allDone = next.every((item) => item.sets.every((set) => set.done));
    if (justCompleted && !allDone) {
      const rest = next[exerciseIndex].exercise.restSeconds;
      // Exercício sem descanso: não inicia o timer e encerra o de outro exercício.
      if (rest > 0) timer.start(rest);
      else timer.stop();
    }
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

  // Remove a última série ainda pendente; sempre sobra ao menos uma série.
  const removeSet = (exerciseIndex: number) => {
    const item = items[exerciseIndex];
    if (item.sets.length <= 1) return;
    let target = -1;
    item.sets.forEach((set, j) => {
      if (!set.done) target = j;
    });
    if (target < 0) return;
    if (isTimerOn(item.exercise.id, target)) setTimer.cancel();
    setItems((current) =>
      current.map((it, i) =>
        i !== exerciseIndex ? it : { ...it, sets: it.sets.filter((_, j) => j !== target) },
      ),
    );
    Vibration.vibrate(10);
  };

  // Alterna repetições/tempo; só antes de concluir séries, para não misturar segundos e reps.
  const switchMode = (exerciseIndex: number, timed: boolean) => {
    const item = items[exerciseIndex];
    if (Boolean(item.exercise.timed) === timed || item.sets.some((set) => set.done)) return;
    if (setTimer.target?.exerciseId === item.exercise.id) setTimer.cancel();
    const exercise: Exercise = {
      ...item.exercise,
      timed: timed || undefined,
      sets: item.exercise.sets.map((set) => ({
        ...set,
        reps: timed ? DEFAULT_SECONDS : DEFAULT_REPS,
      })),
    };
    const previous = lastSetsFor(exercise.id, exercise.timed, exercise.unilateral);
    setItems((current) =>
      current.map((it, i) =>
        i !== exerciseIndex ? it : { ...it, exercise, sets: buildSets(exercise, previous), previous },
      ),
    );
  };

  // Peso total x por lado vale para o exercício todo; só antes de concluir séries (mesma regra do modo tempo).
  const setUnilateral = (exerciseIndex: number, unilateral: boolean) => {
    const item = items[exerciseIndex];
    if (Boolean(item.exercise.unilateral) === unilateral) return;
    const exercise: Exercise = { ...item.exercise, unilateral: unilateral || undefined };
    const previous = lastSetsFor(exercise.id, exercise.timed, unilateral);
    setItems((current) =>
      current.map((it, i) => (i !== exerciseIndex ? it : { ...it, exercise, previous })),
    );
  };

  // Marcar todas não dispara o descanso: quem usa já terminou o exercício.
  const markAll = (exerciseIndex: number) => {
    const finishedId = items[exerciseIndex]?.exercise.id;
    if (setTimer.target?.exerciseId === finishedId) setTimer.cancel();
    setReopenedIds((current) => current.filter((id) => id !== finishedId));
    setItems((current) =>
      current.map((item, i) =>
        i !== exerciseIndex
          ? item
          : { ...item, sets: item.sets.map((set) => ({ ...set, done: true })) },
      ),
    );
    timer.stop();
  };

  // Muda a posição do exercício na sessão; os estados por id (cards reabertos) acompanham o exercício.
  const moveItem = (exerciseId: string, target: 'up' | 'down' | 'first' | 'last') => {
    setItems((current) => {
      const from = current.findIndex((item) => item.exercise.id === exerciseId);
      if (from < 0) return current;
      const to =
        target === 'up' ? from - 1 : target === 'down' ? from + 1 : target === 'first' ? 0 : current.length - 1;
      if (to < 0 || to >= current.length || to === from) return current;
      const next = current.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    Vibration.vibrate(10);
  };

  const startReplace = (exerciseIndex: number) => {
    if (items[exerciseIndex].sets.some((set) => set.done)) {
      Alert.alert(
        'Não dá para substituir',
        'Este exercício já tem séries concluídas. Desmarque-as ou adicione o novo exercício.',
      );
      return;
    }
    if (setTimer.target?.exerciseId === items[exerciseIndex].exercise.id) setTimer.cancel();
    setPicker({ mode: 'replace', index: exerciseIndex });
  };

  const handlePickerConfirm = (selected: LibraryExercise[]) => {
    const target = picker;
    setPicker(null);
    if (!target || selected.length === 0) return;

    if (target.mode === 'replace') {
      const library = selected[0];
      setItems((current) =>
        current.map((item, i) => {
          if (i !== target.index) return item;
          // Mantém séries planejadas e descanso; o id novo evita herdar o histórico do antigo.
          const exercise: Exercise = {
            ...createExerciseFromLibrary(library),
            sets: item.exercise.sets,
            restSeconds: item.exercise.restSeconds,
          };
          return {
            exercise,
            sets: buildSets(exercise, undefined),
            previous: undefined,
            origin: item.origin ?? 'replaced',
          };
        }),
      );
      timer.stop();
      return;
    }

    setItems((current) => [
      ...current,
      ...selected.map((library): ExerciseProgress => {
        const exercise = createExerciseFromLibrary(library);
        return { exercise, sets: buildSets(exercise, undefined), previous: undefined, origin: 'added' };
      }),
    ]);
  };

  const finish = () => {
    const exercises = items
      .map(({ exercise, sets }) => ({
        exerciseId: exercise.id,
        name: nameOf(exercise),
        libraryId: exercise.libraryId,
        timed: exercise.timed,
        unilateral: exercise.unilateral,
        sets: sets
          .filter((set) => set.done)
          .map((set) => ({ weight: set.weight, reps: set.reps })),
      }))
      .filter((exercise) => exercise.sets.length > 0);

    if (exercises.length === 0) {
      onExit();
      return;
    }

    const session: WorkoutSession = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      planId: plan.id,
      planName: plan.name,
      dayId: day.id,
      dayLabel: day.label,
      startedAt,
      finishedAt: new Date().toISOString(),
      exercises,
    };

    const replaced = items.filter((item) => item.origin === 'replaced').length;
    const added = items.filter((item) => item.origin === 'added').length;
    // Ordem relativa dos exercícios do plano que continuam no treino, comparada com a original.
    const keptIds = items.filter((item) => item.origin === undefined).map((item) => item.exercise.id);
    const originalIds = day.exercises.map((exercise) => exercise.id).filter((id) => keptIds.includes(id));
    const reordered = keptIds.some((id, index) => id !== originalIds[index]);
    if (!allowEdit || (replaced + added === 0 && !reordered)) {
      onFinish(session);
      return;
    }

    const parts = [
      replaced > 0 ? `trocou ${pluralExercises(replaced)}` : null,
      added > 0 ? `adicionou ${pluralExercises(added)}` : null,
      reordered ? 'reordenou os exercícios' : null,
    ].filter(Boolean);
    const changes =
      parts.length > 1 ? `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}` : parts[0];
    Alert.alert(
      'Treino alterado',
      `Você ${changes}. Atualizar o plano "${plan.name} – ${displayDayLabel(day.label)}"?`,
      [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Só neste treino', onPress: () => onFinish(session) },
        {
          text: 'Atualizar plano',
          onPress: () => {
            onUpdatePlan(items.map((item) => item.exercise));
            onFinish(session);
          },
        },
      ],
    );
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
          TREINO {displayDayLabel(day.label).toUpperCase()}
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
                accessibilityLabel={`${nameOf(item.exercise)} concluído. Toque para reabrir`}
              >
                <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                <Text style={styles.collapsedName} numberOfLines={1}>
                  {nameOf(item.exercise)}
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
                    {nameOf(item.exercise)}
                  </Text>
                  {item.previous && item.previous.length > 0 && (
                    <Text style={styles.previous} numberOfLines={1}>
                      Última vez: {formatPrevious(item.previous, item.exercise.timed)}
                    </Text>
                  )}
                </View>
                {item.exercise.libraryId && getLibraryExercise(item.exercise.libraryId) && (
                  <Pressable
                    onPress={() => setHowToId(item.exercise.libraryId ?? null)}
                    style={styles.howToButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Como fazer ${nameOf(item.exercise)}`}
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

              {!item.sets.some((set) => set.done) && (
                <View style={styles.modeRow}>
                  {([false, true] as const).map((mode) => {
                    const selected = Boolean(item.exercise.timed) === mode;
                    return (
                      <Pressable
                        key={String(mode)}
                        onPress={() => switchMode(exerciseIndex, mode)}
                        style={[styles.modeOption, selected && styles.modeOptionSelected]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={mode ? 'Exercício por tempo' : 'Exercício por repetições'}
                      >
                        <Text style={[styles.modeText, selected && styles.modeTextSelected]}>
                          {mode ? 'POR TEMPO' : 'REPETIÇÕES'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <View style={styles.setHeader}>
                <Text style={[styles.setHeaderText, styles.indexCol]}>SÉRIE</Text>
                <Text style={[styles.setHeaderText, styles.headerCol]}>{item.exercise.timed ? 'TEMPO' : 'REPS'}</Text>
                <Text style={[styles.setHeaderText, styles.headerCol]}>
                  {item.exercise.unilateral ? 'POR LADO (KG)' : 'PESO (KG)'}
                </Text>
                <View style={styles.checkSpacer} />
              </View>

              {item.sets.map((set, setIndex) => {
                const timed = Boolean(item.exercise.timed);
                const timerOn = timed && isTimerOn(item.exercise.id, setIndex);
                const paused = timerOn && setTimer.phase === 'paused';
                const prep = timerOn && setTimer.phase === 'prep';
                return (
                  <View
                    key={setIndex}
                    style={[styles.setRow, timed && styles.setRowTimed, set.done && styles.setRowDone]}
                  >
                    <Text style={[styles.indexText, styles.indexCol]}>{setIndex + 1}</Text>
                    {timerOn ? (
                      <>
                        <Pressable
                          style={styles.timerBlock}
                          onPress={
                            prep
                              ? () => setTimer.start(setTimer.target as SetTimerTarget, set.reps, true)
                              : undefined
                          }
                          accessibilityRole="timer"
                          accessibilityLabel={
                            prep
                              ? `Prepare-se, começa em ${setTimer.remaining}. Toque para pular`
                              : paused
                                ? `Pausado, restam ${setTimer.remaining} segundos`
                                : `${setTimer.remaining} segundos restantes`
                          }
                        >
                          <Text
                            style={[styles.timerValue, paused && styles.timerPaused]}
                            accessibilityElementsHidden
                          >
                            {prep ? setTimer.remaining : formatSeconds(setTimer.remaining)}
                          </Text>
                          <Text style={styles.timerStatus} accessibilityLiveRegion="polite">
                            {prep ? 'PREPARE-SE' : paused ? 'PAUSADO' : 'EM ANDAMENTO'}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={paused ? setTimer.resume : setTimer.pause}
                          style={styles.check}
                          accessibilityRole="button"
                          accessibilityLabel={paused ? 'Retomar' : 'Pausar'}
                        >
                          <Ionicons name={paused ? 'play' : 'pause'} size={20} color={colors.text} />
                        </Pressable>
                        <Pressable
                          onPress={setTimer.cancel}
                          style={[styles.check, styles.cancelTimer]}
                          accessibilityRole="button"
                          accessibilityLabel="Cancelar contagem"
                        >
                          <Ionicons name="close" size={20} color={colors.danger} />
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <Pressable
                          style={styles.valueCol}
                          onPress={() => setEditing({ exerciseIndex, setIndex })}
                          accessibilityRole="button"
                          accessibilityLabel={
                            timed
                              ? `Tempo da série ${setIndex + 1}: ${set.reps} segundos. Toque para alterar`
                              : `Repetições da série ${setIndex + 1}: ${set.reps}. Toque para alterar`
                          }
                        >
                          <Text style={styles.valueText}>{timed ? formatSeconds(set.reps) : set.reps}</Text>
                        </Pressable>
                        <Pressable
                          style={styles.valueCol}
                          onPress={() => setEditing({ exerciseIndex, setIndex })}
                          accessibilityRole="button"
                          accessibilityLabel={`Carga da série ${setIndex + 1}: ${formatWeight(set.weight)} quilos. Toque para alterar`}
                        >
                          <Text style={styles.valueText}>{formatWeight(set.weight)}</Text>
                        </Pressable>
                        {timed && !set.done ? (
                          <Pressable
                            onPress={() =>
                              startSetTimer({ exerciseId: item.exercise.id, setIndex }, set.reps)
                            }
                            onLongPress={() => toggleDone(exerciseIndex, setIndex)}
                            style={[styles.check, styles.checkPlay]}
                            accessibilityRole="button"
                            accessibilityLabel={`Iniciar série ${setIndex + 1}, ${set.reps} segundos`}
                            accessibilityHint="Mantenha pressionado para marcar como feita sem cronometrar"
                          >
                            <Ionicons name="play" size={18} color={colors.onPrimary} />
                          </Pressable>
                        ) : (
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
                        )}
                      </>
                    )}
                  </View>
                );
              })}

              <View style={styles.actions}>
                <Pressable
                  onPress={() => addSet(exerciseIndex)}
                  style={styles.actionButton}
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar série"
                >
                  <Ionicons name="add" size={20} color={colors.accent} />
                  <Text style={styles.addText}>ADICIONAR SÉRIE</Text>
                </Pressable>
                {(() => {
                  const canRemove = item.sets.length > 1 && item.sets.some((set) => !set.done);
                  return (
                    <Pressable
                      onPress={() => removeSet(exerciseIndex)}
                      disabled={!canRemove}
                      style={[styles.actionButton, !canRemove && styles.moveDisabled]}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !canRemove }}
                      accessibilityLabel="Remover a última série pendente"
                    >
                      <Ionicons name="remove" size={20} color={colors.danger} />
                      <Text style={styles.removeText}>REMOVER</Text>
                    </Pressable>
                  );
                })()}
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

              {allowEdit && (
                <View style={styles.editRow}>
                  <Pressable
                    onPress={() => startReplace(exerciseIndex)}
                    style={styles.replaceButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Substituir ${nameOf(item.exercise)}`}
                  >
                    <Ionicons name="swap-vertical" size={18} color={colors.text} />
                    <Text style={styles.replaceText}>SUBSTITUIR</Text>
                  </Pressable>
                  {(
                    [
                      { target: 'up', label: 'SUBIR', icon: 'arrow-up', disabled: exerciseIndex === 0 },
                      { target: 'down', label: 'DESCER', icon: 'arrow-down', disabled: exerciseIndex === items.length - 1 },
                      { target: 'first', label: 'PRIMEIRO', icon: 'arrow-up-circle-outline', disabled: exerciseIndex === 0 },
                      { target: 'last', label: 'ÚLTIMO', icon: 'arrow-down-circle-outline', disabled: exerciseIndex === items.length - 1 },
                    ] as const
                  ).map((move) => (
                    <Pressable
                      key={move.target}
                      onPress={() => moveItem(item.exercise.id, move.target)}
                      disabled={move.disabled}
                      style={[styles.replaceButton, move.disabled && styles.moveDisabled]}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: move.disabled }}
                      accessibilityLabel={`Mover ${nameOf(item.exercise)}: ${move.label.toLowerCase()}`}
                    >
                      <Ionicons name={move.icon} size={18} color={colors.text} />
                      <Text style={styles.replaceText}>{move.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {allowEdit && (
          <Pressable
            onPress={() => setPicker({ mode: 'add' })}
            style={styles.addExercise}
            accessibilityRole="button"
            accessibilityLabel="Adicionar exercício ao treino"
          >
            <Ionicons name="add" size={22} color={colors.accent} />
            <Text style={styles.addText}>ADICIONAR EXERCÍCIO</Text>
          </Pressable>
        )}
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

      {celebration !== null && (
        <Animated.View
          pointerEvents="none"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            styles.celebration,
            {
              top: insets.top + 118,
              opacity: celebrationAnim,
              transform: [
                { translateY: celebrationAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
              ],
            },
          ]}
        >
          <Ionicons name="trending-up" size={20} color={colors.onPrimary} />
          <Text style={styles.celebrationText}>{CELEBRATION_TEXT}</Text>
        </Animated.View>
      )}

      <ExerciseDetailModal libraryId={howToId} onClose={() => setHowToId(null)} />

      <Modal visible={picker !== null} animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={[styles.pickerContainer, { paddingTop: insets.top }]}>
          <ExerciseLibrary
            title={picker?.mode === 'replace' ? 'Substituir exercício' : 'Adicionar exercício'}
            selectable
            single={picker?.mode === 'replace'}
            confirmLabel={picker?.mode === 'replace' ? 'Substituir' : 'Adicionar'}
            preferredGroups={day.muscleGroups}
            similarTo={picker?.mode === 'replace' ? items[picker.index]?.exercise.libraryId : undefined}
            excludeIds={items.flatMap((item) => (item.exercise.libraryId ? [item.exercise.libraryId] : []))}
            onConfirm={handlePickerConfirm}
            onClose={() => setPicker(null)}
          />
        </View>
      </Modal>

      {editing && editingItem && (
        <SetValueSheet
          title={`${nameOf(editingItem.exercise).toUpperCase()} (${editing.setIndex + 1}/${editingItem.sets.length})`}
          hint={
            editing.setIndex < editingItem.sets.length - 1
              ? 'Vale também para as próximas séries não concluídas'
              : undefined
          }
          reps={editingItem.sets[editing.setIndex].reps}
          weight={editingItem.sets[editing.setIndex].weight}
          timed={editingItem.exercise.timed}
          unilateral={Boolean(editingItem.exercise.unilateral)}
          onUnilateralChange={
            editingItem.sets.some((set) => set.done)
              ? undefined
              : (value) => setUnilateral(editing.exerciseIndex, value)
          }
          onConfirm={(reps, weight) => updateSet(editing.exerciseIndex, editing.setIndex, reps, weight)}
          onClose={() => setEditing(null)}
        />
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
  setRowTimed: {
    minHeight: 60,
  },
  setRowDone: {
    borderColor: colors.accent,
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
  checkPlay: {
    backgroundColor: colors.primary,
  },
  cancelTimer: {
    marginLeft: 16,
  },
  timerBlock: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerValue: {
    color: colors.accent,
    fontFamily: fonts.displayBold,
    fontSize: 32,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  timerPaused: {
    opacity: 0.5,
  },
  timerStatus: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 12,
    letterSpacing: 0.6,
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
    color: colors.accent,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    letterSpacing: 0.4,
  },
  celebration: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  celebrationText: {
    color: colors.onPrimary,
    fontFamily: fonts.displayBold,
    fontSize: 17,
    letterSpacing: 0.3,
  },
  removeText: {
    color: colors.danger,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    letterSpacing: 0.4,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  modeOption: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  modeOptionSelected: {
    backgroundColor: colors.primary,
  },
  modeText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 16,
  },
  modeTextSelected: {
    color: colors.onPrimary,
  },
  markText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    letterSpacing: 0.4,
  },
  editRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moveDisabled: {
    opacity: 0.4,
  },
  replaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  replaceText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    letterSpacing: 0.4,
  },
  addExercise: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 52,
    marginTop: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: colors.background,
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
