import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
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
import { fontSize, fonts, radius, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import { ExerciseDetailModal } from '../../exercises/components/ExerciseDetail';
import { ExerciseLibrary } from '../../exercises/components/ExerciseLibrary';
import type { LibraryExercise } from '../../exercises/services/exerciseLibrary';
import { syncExpiryReminders } from '../../settings/services/expiryReminders';
import { DayTabs } from '../components/DayTabs';
import { ExerciseRow } from '../components/ExerciseRow';
import { ExerciseSheet } from '../components/ExerciseSheet';
import { PlanForm } from '../components/PlanForm';
import { ExpirySheet } from '../components/ExpirySheet';
import { PlanSwitcherSheet } from '../components/PlanSwitcherSheet';
import { usePlans } from '../hooks/usePlans';
import { createExerciseFromLibrary } from '../services/exerciseFactory';
import { expiryText, isExpired, isExpiringSoon } from '../services/planExpiry';
import type { Exercise, NewPlan, Plan, PlanDay } from '../types';

interface PlanScreenProps {
  /** Espaço reservado para a barra de abas flutuante. */
  bottomInset: number;
  onStartTraining: (plan: Plan, day: PlanDay) => void;
  onOpenSettings: () => void;
  /** Aviso de vencimento ligado nas configurações. */
  remindersEnabled: boolean;
  /** Pedido para abrir a lista de planos em um plano (ex.: toque na notificação de vencimento). */
  focusRequest: { planId: string; nonce: number } | null;
  /** Treino finalizado com mudanças que o usuário quis gravar no plano de origem. */
  planUpdate: { planId: string; dayId: string; exercises: Exercise[]; nonce: number } | null;
}

export function PlanScreen({
  bottomInset,
  onStartTraining,
  onOpenSettings,
  remindersEnabled,
  focusRequest,
  planUpdate,
}: PlanScreenProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { plans, isLoading, error, addPlan, removePlan, setPlanExpiry, setDayExercises } = usePlans();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [howToId, setHowToId] = useState<string | null>(null);

  // Só os planos vigentes entram na escolha automática; o selecionado à mão (ex.: um vencido
  // aberto pela lista, ou um treino em andamento) é mantido.
  const now = new Date();
  const currentPlans = plans.filter((item) => !isExpired(item, now));
  const expiredPlans = plans.filter((item) => isExpired(item, now));
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const reactivatePlan = (planId: string, expiresAt: string | undefined) => {
    setPlanExpiry(planId, expiresAt);
    setSelectedPlanId(planId);
    setSelectedDayId(null);
    setIsSwitcherOpen(false);
    setRenewingId(null);
    setToast('Plano reativado');
  };

  useEffect(() => {
    if (isLoading) return;
    syncExpiryReminders(plans, remindersEnabled).catch(() => undefined);
  }, [plans, isLoading, remindersEnabled]);

  useEffect(() => {
    if (!planUpdate || isLoading) return;
    setDayExercises(planUpdate.planId, planUpdate.dayId, planUpdate.exercises);
    setToast('Plano atualizado');
    // Só reage a um novo pedido (nonce), não a mudanças em plans/setDayExercises.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planUpdate?.nonce]);

  useEffect(() => {
    if (!focusRequest) return;
    setSelectedPlanId(focusRequest.planId);
    setSelectedDayId(null);
    setIsSwitcherOpen(true);
  }, [focusRequest]);

  const plan = plans.find((item) => item.id === selectedPlanId) ?? currentPlans[0] ?? null;
  const day = plan?.days.find((item) => item.id === selectedDayId) ?? plan?.days[0] ?? null;
  const renewingPlan = plans.find((item) => item.id === renewingId) ?? null;
  const renewingExpired = renewingPlan !== null && isExpired(renewingPlan, now);
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
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : !plan || !day ? (
        <EmptyState
          expiredCount={expiredPlans.length}
          onCreate={() => setIsFormOpen(true)}
          onReactivate={() =>
            expiredPlans.length === 1 ? setRenewingId(expiredPlans[0].id) : setIsSwitcherOpen(true)
          }
        />
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
            {expiredPlans.length > 0 && (
              <Pressable
                onPress={() => setIsSwitcherOpen(true)}
                style={styles.expiredChip}
                accessibilityRole="button"
                accessibilityLabel={`${expiredPlans.length} ${expiredPlans.length === 1 ? 'plano vencido' : 'planos vencidos'}. Toque para ver`}
              >
                <Ionicons name="archive-outline" size={16} color={colors.textMuted} />
                <Text style={styles.expiredChipText}>
                  {expiredPlans.length} {expiredPlans.length === 1 ? 'vencido' : 'vencidos'}
                </Text>
              </Pressable>
            )}
          </View>

          {(isExpired(plan, now) || isExpiringSoon(plan, now)) && (
            <Pressable
              onPress={() => setRenewingId(plan.id)}
              style={[styles.banner, isExpired(plan, now) && styles.bannerExpired]}
              accessibilityRole="button"
              accessibilityLabel={`Plano ${expiryText(plan, now)}. ${isExpired(plan, now) ? 'Reativar' : 'Renovar'}`}
            >
              <Text style={styles.bannerText} numberOfLines={1}>
                {plan.name} {expiryText(plan, now)}
              </Text>
              <Text style={styles.bannerAction}>{isExpired(plan, now) ? 'REATIVAR' : 'RENOVAR'}</Text>
            </Pressable>
          )}

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

      <Pressable
        onPress={onOpenSettings}
        style={[styles.settingsButton, { top: insets.top + 12 }]}
        accessibilityRole="button"
        accessibilityLabel="Configurações"
      >
        <Ionicons name="settings-outline" size={24} color={colors.text} />
      </Pressable>

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
        onRenew={(target) => setRenewingId(target.id)}
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

      {renewingId && (
        <ExpirySheet
          visible
          title={renewingExpired ? 'Reativar plano' : 'Renovar prazo'}
          reactivate={renewingExpired}
          value={renewingPlan?.expiresAt}
          onConfirm={(next) => {
            if (renewingExpired) {
              reactivatePlan(renewingId, next);
            } else {
              setPlanExpiry(renewingId, next);
              setRenewingId(null);
            }
          }}
          onClose={() => setRenewingId(null)}
        />
      )}

      {toast && (
        <View style={[styles.toast, { bottom: bottomInset + 24 }]} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <ExerciseDetailModal libraryId={howToId} onClose={() => setHowToId(null)} />
    </View>
  );
}

interface EmptyStateProps {
  /** Quantidade de planos vencidos quando não há nenhum vigente. */
  expiredCount: number;
  onCreate: () => void;
  onReactivate: () => void;
}

function EmptyState({ expiredCount, onCreate, onReactivate }: EmptyStateProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const expired = expiredCount > 0;
  return (
    <View style={styles.empty}>
      <Ionicons name="barbell" size={64} color={colors.accent} />
      <Text style={styles.emptyTitle}>
        {expired
          ? expiredCount === 1
            ? 'Seu plano venceu'
            : 'Seus planos venceram'
          : 'Crie seu plano de treino'}
      </Text>
      <Text style={styles.emptyText}>
        {expired
          ? 'Reative um plano vencido ou crie um novo.'
          : 'Crie seus treinos (A, B...) e monte a lista de exercícios de cada um.'}
      </Text>
      {expired && (
        <PrimaryButton
          label={expiredCount === 1 ? 'Reativar' : 'Ver planos vencidos'}
          onPress={onReactivate}
          style={styles.emptyButton}
        />
      )}
      <PrimaryButton
        label={expired ? 'Novo plano' : 'Criar plano'}
        onPress={onCreate}
        style={expired ? styles.emptySecondary : styles.emptyButton}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    marginTop: 64,
  },
  settingsButton: {
    position: 'absolute',
    right: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingLeft: 20,
    paddingRight: 64,
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
  expiredChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 4,
  },
  expiredChipText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toastText: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 44,
    marginHorizontal: 20,
    marginTop: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  bannerExpired: {
    backgroundColor: colors.surfaceAlt,
  },
  bannerText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
  },
  bannerAction: {
    color: colors.accent,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    letterSpacing: 0.4,
  },
  emptySecondary: {
    alignSelf: 'stretch',
    opacity: 0.85,
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
