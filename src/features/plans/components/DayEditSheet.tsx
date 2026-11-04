import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '../../../shared/components/BottomSheet';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { fontSize, fonts, radius, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import { displayDayLabel, MUSCLE_GROUPS, type MuscleGroup, type PlanDay } from '../types';

export const DAY_NAME_MAX = 20;

interface DayEditSheetProps {
  day: PlanDay;
  /** Só há exclusão quando o plano tem mais de um treino. */
  canDelete: boolean;
  onSave: (changes: Pick<PlanDay, 'label' | 'muscleGroups'>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function DayEditSheet({ day, canDelete, onSave, onDelete, onClose }: DayEditSheetProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const currentLabel = displayDayLabel(day.label);
  const [name, setName] = useState(currentLabel);
  const [groups, setGroups] = useState<MuscleGroup[]>(day.muscleGroups);

  const toggle = (group: MuscleGroup) =>
    setGroups((current) =>
      current.includes(group) ? current.filter((item) => item !== group) : [...current, group],
    );

  const confirmDelete = () => {
    const count = day.exercises.length;
    const detail =
      count === 0
        ? 'Este treino está vazio.'
        : `${count} ${count === 1 ? 'exercício será removido' : 'exercícios serão removidos'}. Os treinos já salvos no histórico não mudam.`;
    Alert.alert(`Excluir treino ${currentLabel}?`, detail, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Editar treino</Text>

        <Text style={styles.label}>NOME DO TREINO</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          maxLength={DAY_NAME_MAX}
          placeholder={currentLabel}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Nome do treino"
        />

        <Text style={styles.label}>GRUPOS MUSCULARES (OPCIONAL)</Text>
        <View style={styles.row}>
          {MUSCLE_GROUPS.map((group) => {
            const selected = groups.includes(group);
            return (
              <Pressable
                key={group}
                onPress={() => toggle(group)}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={group}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{group}</Text>
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton
          label="Salvar"
          onPress={() => onSave({ label: name.trim() || currentLabel, muscleGroups: groups })}
          style={styles.save}
        />

        {canDelete ? (
          <Pressable
            onPress={confirmDelete}
            style={styles.delete}
            accessibilityRole="button"
            accessibilityLabel={`Excluir treino ${currentLabel}`}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Text style={styles.deleteText}>Excluir treino</Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>O plano precisa ter pelo menos um treino.</Text>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    heading: {
      color: colors.text,
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.lg,
      textAlign: 'center',
    },
    label: {
      color: colors.textMuted,
      fontFamily: fonts.displayBold,
      fontSize: 18,
      letterSpacing: 0.4,
      marginTop: 20,
      marginBottom: 8,
    },
    input: {
      minHeight: 56,
      paddingHorizontal: 20,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: fontSize.md,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 18,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
    },
    chipSelected: {
      backgroundColor: colors.primary,
    },
    chipText: {
      color: colors.text,
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.sm,
    },
    chipTextSelected: {
      color: colors.onPrimary,
    },
    save: {
      marginTop: 24,
    },
    delete: {
      minHeight: 52,
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    deleteText: {
      color: colors.danger,
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.md,
    },
    hint: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      textAlign: 'center',
      marginTop: 16,
    },
  });
