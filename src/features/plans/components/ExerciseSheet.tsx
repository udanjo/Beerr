import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '../../../shared/components/BottomSheet';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import {
  DEFAULT_REPS,
  DEFAULT_WEIGHT,
  SetValueSheet,
  formatWeight,
} from '../../../shared/components/SetValueSheet';
import { colors, fontSize, fonts, radius } from '../../../shared/theme';
import { ExerciseThumb } from '../../exercises/components/ExerciseThumb';
import { REST_OPTIONS, type Exercise } from '../types';

interface ExerciseSheetProps {
  exercise: Exercise;
  onClose: () => void;
  onSave: (exercise: Exercise) => void;
  onRemove: (exerciseId: string) => void;
  onShowHowTo: (libraryId: string) => void;
  onReplace: (exerciseId: string) => void;
}

interface SetDraft {
  reps: number;
  weight: number;
}

function formatRest(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function toNumber(value: string): number {
  return Number(value.replace(',', '.')) || 0;
}

export function ExerciseSheet({
  exercise,
  onClose,
  onSave,
  onRemove,
  onShowHowTo,
  onReplace,
}: ExerciseSheetProps) {
  const [sets, setSets] = useState<SetDraft[]>(() =>
    exercise.sets.map((set) => ({ reps: set.reps || DEFAULT_REPS, weight: set.weight })),
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [rest, setRest] = useState(String(exercise.restSeconds));
  const [notes, setNotes] = useState(exercise.notes ?? '');

  const updateSet = (index: number, reps: number, weight: number) => {
    // A série editada e todas as seguintes recebem o novo valor; as anteriores ficam como estão.
    setSets((current) => current.map((set, i) => (i >= index ? { reps, weight } : set)));
    setEditingIndex(null);
  };

  // Nova série repete a anterior; sem séries, usa o padrão 12 reps / 0 kg.
  const addSet = () => {
    setSets((current) => [
      ...current,
      current.length > 0
        ? { ...current[current.length - 1] }
        : { reps: DEFAULT_REPS, weight: DEFAULT_WEIGHT },
    ]);
  };

  const removeSet = (index: number) => {
    setSets((current) => current.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave({
      ...exercise,
      restSeconds: Math.max(0, Math.round(toNumber(rest))),
      notes: notes.trim() || undefined,
      sets,
    });
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <ExerciseThumb libraryId={exercise.libraryId} size={64} />
          <Text style={styles.name} numberOfLines={2}>
            {exercise.name}
          </Text>
        </View>

        <View style={styles.actions}>
          {exercise.libraryId && (
            <ActionPill
              icon="play"
              label="Como fazer"
              onPress={() => onShowHowTo(exercise.libraryId as string)}
            />
          )}
          <ActionPill icon="swap-vertical" label="Substituir" onPress={() => onReplace(exercise.id)} />
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.indexCol]}>SÉRIE</Text>
          <Text style={[styles.headerText, styles.inputCol]}>REPS</Text>
          <Text style={[styles.headerText, styles.inputCol]}>PESO (KG)</Text>
          <View style={styles.removeCol} />
        </View>

        {sets.map((set, index) => (
          <View key={index} style={styles.setRow}>
            <View style={styles.setPill}>
              <Text style={[styles.indexText, styles.indexCol]}>{index + 1}</Text>
              <Pressable
                style={styles.valueCol}
                onPress={() => setEditingIndex(index)}
                accessibilityRole="button"
                accessibilityLabel={`Repetições da série ${index + 1}: ${set.reps}. Toque para alterar`}
              >
                <Text style={styles.valueText}>{set.reps}</Text>
              </Pressable>
              <Pressable
                style={styles.valueCol}
                onPress={() => setEditingIndex(index)}
                accessibilityRole="button"
                accessibilityLabel={`Carga da série ${index + 1}: ${formatWeight(set.weight)} quilos. Toque para alterar`}
              >
                <Text style={styles.valueText}>{formatWeight(set.weight)}</Text>
              </Pressable>
            </View>
            <View style={styles.removeCol}>
              {sets.length > 1 && (
                <Pressable
                  onPress={() => removeSet(index)}
                  style={styles.removeButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover série ${index + 1}`}
                >
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          </View>
        ))}

        <Pressable
          onPress={addSet}
          style={styles.addSet}
          accessibilityRole="button"
          accessibilityLabel="Adicionar série"
        >
          <Ionicons name="add" size={22} color={colors.primary} />
          <Text style={styles.addSetText}>SÉRIE</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>INTERVALO DE DESCANSO</Text>
        <View style={styles.restRow}>
          <TextInput
            style={[styles.pill, styles.restInput, styles.input]}
            value={rest}
            onChangeText={setRest}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Intervalo de descanso em segundos"
          />
          <Text style={styles.restUnit}>segundos</Text>
        </View>
        <View style={styles.restOptions}>
          {REST_OPTIONS.map((option) => {
            const selected = Number(rest) === option;
            return (
              <Pressable
                key={option}
                onPress={() => setRest(String(option))}
                style={[styles.restOption, selected && styles.restOptionSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Descanso de ${option} segundos`}
              >
                <Text style={[styles.restOptionText, selected && styles.restOptionTextSelected]}>
                  {formatRest(option)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>OBSERVAÇÃO</Text>
        <TextInput
          style={styles.notes}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={300}
          placeholder="Ex.: banco na posição 3, pegada fechada, cuidado com o ombro"
          placeholderTextColor={colors.textMuted}
          textAlignVertical="top"
          accessibilityLabel="Observação do exercício"
        />

        <PrimaryButton label="Salvar" onPress={handleSave} style={styles.save} />

        <Pressable
          onPress={() => onRemove(exercise.id)}
          style={styles.removeExercise}
          accessibilityRole="button"
          accessibilityLabel="Remover exercício do dia"
        >
          <Text style={styles.removeExerciseText}>REMOVER EXERCÍCIO</Text>
        </Pressable>
      </ScrollView>

      {editingIndex !== null && sets[editingIndex] && (
        <SetValueSheet
          title={`${exercise.name.toUpperCase()} (${editingIndex + 1}/${sets.length})`}
          hint={editingIndex < sets.length - 1 ? 'Vale também para as séries seguintes' : undefined}
          reps={sets[editingIndex].reps}
          weight={sets[editingIndex].weight}
          onConfirm={(reps, weight) => updateSet(editingIndex, reps, weight)}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </BottomSheet>
  );
}

interface ActionPillProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
}

function ActionPill({ icon, label, accessibilityLabel, onPress }: ActionPillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.actionPill}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
      <Text style={styles.actionText}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.lg,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 12,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  actionText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    letterSpacing: 0.4,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  headerText: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 14,
    textAlign: 'center',
  },
  indexCol: {
    width: 56,
    textAlign: 'center',
  },
  inputCol: {
    flex: 1,
  },
  removeCol: {
    width: 40,
    alignItems: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  setPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  valueCol: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  indexText: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
  },
  input: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: fontSize.lg,
    textAlign: 'center',
  },
  valueText: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: fontSize.lg,
  },
  removeButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    marginTop: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addSetText: {
    color: colors.primary,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    letterSpacing: 0.4,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 14,
    letterSpacing: 0.4,
    marginTop: 18,
    marginBottom: 8,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restInput: {
    width: 120,
  },
  restUnit: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
  },
  restOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  restOption: {
    minHeight: 44,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  restOptionSelected: {
    backgroundColor: colors.primary,
  },
  restOptionText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 16,
  },
  restOptionTextSelected: {
    color: colors.onPrimary,
  },
  notes: {
    minHeight: 96,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
  },
  save: {
    marginTop: 24,
  },
  removeExercise: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  removeExerciseText: {
    color: colors.danger,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    letterSpacing: 0.4,
  },
});
