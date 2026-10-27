import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { colors, fontSize, fonts, radius } from '../../../shared/theme';
import { MAX_DAYS, MUSCLE_GROUPS, type MuscleGroup, type NewPlan } from '../types';

interface PlanFormProps {
  onSubmit: (plan: NewPlan) => void;
  onCancel: () => void;
}

const DAY_LABELS = 'ABCDEFG';
const DEFAULT_NAME = 'Meu plano';

function resizeDays(current: MuscleGroup[][], count: number): MuscleGroup[][] {
  return Array.from({ length: count }, (_, index) => current[index] ?? []);
}

export function PlanForm({ onSubmit, onCancel }: PlanFormProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [dayCount, setDayCount] = useState(3);
  const [groupsByDay, setGroupsByDay] = useState<MuscleGroup[][]>(() => resizeDays([], 3));
  // Os grupos são opcionais: ficam recolhidos e só abrem ao toque.
  const [openDay, setOpenDay] = useState<number | null>(null);

  const changeDayCount = (count: number) => {
    setDayCount(count);
    setGroupsByDay((current) => resizeDays(current, count));
  };

  const toggleGroup = (dayIndex: number, group: MuscleGroup) => {
    setGroupsByDay((current) =>
      current.map((groups, index) => {
        if (index !== dayIndex) return groups;
        return groups.includes(group) ? groups.filter((g) => g !== group) : [...groups, group];
      }),
    );
  };

  const handleSubmit = () => {
    onSubmit({
      name: name.trim() || DEFAULT_NAME,
      days: groupsByDay.map((muscleGroups, index) => ({
        label: `Dia ${DAY_LABELS[index]}`,
        muscleGroups,
      })),
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.heading}>Novo plano</Text>
        <Pressable
          onPress={onCancel}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>NOME DO PLANO</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={DEFAULT_NAME}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Nome do plano"
        />

        <Text style={styles.label}>QUANTOS DIAS DE TREINO?</Text>
        <View style={styles.row}>
          {Array.from({ length: MAX_DAYS }, (_, index) => index + 1).map((count) => {
            const selected = dayCount === count;
            return (
              <Pressable
                key={count}
                onPress={() => changeDayCount(count)}
                style={[styles.dayCount, selected && styles.chipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${count} ${count === 1 ? 'dia' : 'dias'}`}
              >
                <Text style={[styles.dayCountText, selected && styles.chipTextSelected]}>
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>GRUPOS MUSCULARES (OPCIONAL)</Text>
        {groupsByDay.map((groups, dayIndex) => {
          const isOpen = openDay === dayIndex;
          return (
            <View key={dayIndex} style={styles.dayBox}>
              <Pressable
                onPress={() => setOpenDay(isOpen ? null : dayIndex)}
                style={styles.dayHeader}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={`Dia ${DAY_LABELS[dayIndex]}, grupos musculares`}
              >
                <Text style={styles.dayTitle}>DIA {DAY_LABELS[dayIndex]}</Text>
                <Text style={styles.daySummary} numberOfLines={1}>
                  {groups.length > 0 ? groups.join(' · ') : 'Escolher'}
                </Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
              {isOpen && (
                <View style={styles.row}>
                  {MUSCLE_GROUPS.map((group) => {
                    const selected = groups.includes(group);
                    return (
                      <Pressable
                        key={group}
                        onPress={() => toggleGroup(dayIndex, group)}
                        style={[styles.chip, selected && styles.chipSelected]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${group}, Dia ${DAY_LABELS[dayIndex]}`}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {group}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <PrimaryButton label="Criar plano" onPress={handleSubmit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.lg,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    letterSpacing: 0.4,
    marginTop: 8,
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
  dayCount: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  dayCountText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 22,
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
  dayBox: {
    gap: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dayHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayTitle: {
    color: colors.primary,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    letterSpacing: 0.5,
  },
  daySummary: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    textAlign: 'right',
  },
  scroll: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
