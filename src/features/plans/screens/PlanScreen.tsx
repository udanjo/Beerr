import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { colors, fontSize, fonts, radius } from '../../../shared/theme';
import { ExerciseDetailModal } from '../../exercises/components/ExerciseDetail';
import { ExerciseLibrary } from '../../exercises/components/ExerciseLibrary';
import type { LibraryExercise } from '../../exercises/services/exerciseLibrary';
import { DayTabs } from '../components/DayTabs';
import { ExerciseRow } from '../components/ExerciseRow';
import { ExerciseSheet } from '../components/ExerciseSheet';
import { PlanForm } from '../components/PlanForm';
import { PlanSwitcherSheet } from '../components/PlanSwitcherSheet';
import { usePlans } from '../hooks/usePlans';
import { createExerciseFromLibrary } from '../services/exerciseFactory';
import type { Exercise, NewPlan, Plan, PlanDay } from '../types';

interface PlanScreenProps {
  /** Espaço reservado para a barra de abas flutuante. */
  bottomInset: number;
  onStartTraining: (plan: Plan, day: PlanDay) => void;
}

export function PlanScreen({ bottomInset, onStartTraining }: PlanScreenProps) {
  const insets = useSafeAreaInsets();
  const { plans, isLoading, error, addPlan, removePlan, setDayExercises } = usePlans();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [howToId, setHowToId] = useState<string | null>(null);

  const plan = plans.find((item) => item.id === selectedPlanId) ?? plans[0] ?? null;
  const day = plan?.days.find((item) => item.id === selectedDayId) ?? plan?.days[0] ?? null;
  const editingExercise = day?.exercises.find((exercise) => exercise.id === editingId) ?? null;

  const saveExercises = useCallback(
    (exercises: Exercise[]) => {
      if (plan && day) setDayExercises(plan.id, day.id, exercises);
    },
    [plan, day, setDayExercises],
  );

  const handleCreatePlan = (input: NewPlan) => {
    const id = addPlan(input);
    setSelectedPlanId(id);
    setSelectedDayId(null);
    setIsFormOpen(false);
    setIsSwitcherOpen(false);
  };

  const handleDeletePlan = (target: Plan) => {
    Alert.alert('Excluir plano', `Excluir "${target.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => removePlan(target.id) },
    ]);
  };

  const handlePickerConfirm = (selected: LibraryExercise[]) => {
    if (!day) return;

    if (replacingId) {
      const replacement = selected[0];
      if (replacement) {
        saveExercises(
          day.exercises.map((exercise) =>
            exercise.id === replacingId
              ? { ...exercise, name: replacement.name, libraryId: replacement.id }
              : exercise,
          ),
        );
      }
    } else {
      saveExercises([...day.exercises, ...selected.map(createExerciseFromLibrary)]);
    }

    setIsPickerOpen(false);
    setReplacingId(null);
  };

  const closePicker = () => {
    setIsPickerOpen(false);
    setReplacingId(null);
  };

  const handleSaveExercise = (updated: Exercise) => {
    if (!day) return;
    saveExercises(day.exercises.map((exercise) => (exercise.id === updated.id ? updated : exercise)));
    setEditingId(null);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    if (!day) return;
    const target = day.exercises.find((exercise) => exercise.id === exerciseId);
    Alert.alert('Remover exercício', `Remover "${target?.name ?? 'exercício'}" deste dia?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          saveExercises(day.exercises.filter((exercise) => exercise.id !== exerciseId));
          setEditingId(null);
        },
      },
    ]);
  };

  const handleReplace = (exerciseId: string) => {
    setEditingId(null);
    setReplacingId(exerciseId);
    setIsPickerOpen(true);
  };

  const handleHowTo = (libraryId: string) => {
    setEditingId(null);
    setHowToId(libraryId);
  };

  const openExercise = useCallback((exerciseId: string) => setEditingId(exerciseId), []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : !plan || !day ? (
        <EmptyState onCreate={() => setIsFormOpen(true)} />
      ) : (
        <>
          <View style={styles.header}>
            <Pressable
              onPress={() => setIsSwitcherOpen(true)}
              style={styles.planSelector}
              accessibilityRole="button"
              accessibilityLabel={`Plano ${plan.name}. Toque para trocar de plano`}
            >
              <Ionicons name="barbell" size={30} color={colors.text} />
              <Text style={styles.planName} numberOfLines={1}>
                {plan.name}
              </Text>
              <Ionicons name="chevron-down" size={22} color={colors.text} />
            </Pressable>
          </View>

          <DayTabs days={plan.days} activeDayId={day.id} onSelect={setSelectedDayId} />

          {error && <Text style={styles.error}>{error}</Text>}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: bottomInset + 96 }}
            showsVerticalScrollIndicator={false}
          >
            {day.muscleGroups.length > 0 && (
              <Text style={styles.targetsLine} numberOfLines={1}>
                {day.muscleGroups.join(' · ')}
              </Text>
            )}

            <View style={styles.exercisesHeader}>
              <Text style={styles.sectionTitleInline}>
                {day.exercises.length} {day.exercises.length === 1 ? 'EXERCÍCIO' : 'EXERCÍCIOS'}
              </Text>
              <Pressable
                onPress={() => setIsPickerOpen(true)}
                style={styles.addButton}
                accessibilityRole="button"
                accessibilityLabel="Adicionar exercício"
              >
                <Ionicons name="add" size={22} color={colors.text} />
                <Text style={styles.addButtonText}>ADICIONAR</Text>
              </Pressable>
            </View>

            <View style={styles.exerciseList}>
              {day.exercises.length === 0 ? (
                <Text style={styles.emptyDay}>
                  Nenhum exercício neste dia. Toque em “Adicionar” para escolher na biblioteca.
                </Text>
              ) : (
                day.exercises.map((exercise) => (
                  <ExerciseRow key={exercise.id} exercise={exercise} onPress={openExercise} />
                ))
              )}
            </View>
          </ScrollView>

          {day.exercises.length > 0 && (
            <View style={[styles.floating, { bottom: bottomInset + 8 }]} pointerEvents="box-none">
              <PrimaryButton label="Iniciar treino" onPress={() => onStartTraining(plan, day)} />
            </View>
          )}
        </>
      )}

      <PlanSwitcherSheet
        visible={isSwitcherOpen}
        plans={plans}
        activePlanId={plan?.id ?? null}
        onSelect={(id) => {
          setSelectedPlanId(id);
          setSelectedDayId(null);
          setIsSwitcherOpen(false);
        }}
        onDelete={handleDeletePlan}
        onCreate={() => {
          setIsSwitcherOpen(false);
          setIsFormOpen(true);
        }}
        onClose={() => setIsSwitcherOpen(false)}
      />

      {editingExercise && (
        <ExerciseSheet
          key={editingExercise.id}
          exercise={editingExercise}
          onClose={() => setEditingId(null)}
          onSave={handleSaveExercise}
          onRemove={handleRemoveExercise}
          onShowHowTo={handleHowTo}
          onReplace={handleReplace}
        />
      )}

      <Modal visible={isFormOpen} animationType="slide" onRequestClose={() => setIsFormOpen(false)}>
        <PlanForm onSubmit={handleCreatePlan} onCancel={() => setIsFormOpen(false)} />
      </Modal>

      <Modal visible={isPickerOpen} animationType="slide" onRequestClose={closePicker}>
        <View style={[styles.pickerContainer, { paddingTop: insets.top }]}>
          <ExerciseLibrary
            title={replacingId ? 'Substituir exercício' : 'Adicionar exercício'}
            selectable
            single={replacingId !== null}
            confirmLabel={replacingId ? 'Substituir' : 'Adicionar'}
            preferredGroups={day?.muscleGroups}
            onConfirm={handlePickerConfirm}
            onClose={closePicker}
          />
        </View>
      </Modal>

      <ExerciseDetailModal libraryId={howToId} onClose={() => setHowToId(null)} />
    </View>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="barbell" size={64} color={colors.primary} />
      <Text style={styles.emptyTitle}>Crie seu plano de treino</Text>
      <Text style={styles.emptyText}>
        Defina quantos dias você treina e monte a lista de exercícios de cada dia.
      </Text>
      <PrimaryButton label="Criar plano" onPress={onCreate} style={styles.emptyButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    marginTop: 64,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  planSelector: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  planName: {
    flexShrink: 1,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xl,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  scroll: {
    flex: 1,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  targetsLine: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitleInline: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 24,
    letterSpacing: 0.5,
  },
  exercisesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButtonText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    letterSpacing: 0.4,
  },
  exerciseList: {
    paddingHorizontal: 20,
  },
  emptyDay: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    lineHeight: 24,
    paddingVertical: 16,
  },
  floating: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xl,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    lineHeight: 24,
    textAlign: 'center',
  },
  emptyButton: {
    alignSelf: 'stretch',
    marginTop: 16,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
