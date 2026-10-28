import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExpirySheet } from './ExpirySheet';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { fontSize, fonts, radius, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import { dateKeyFromToday, formatDateKey } from '../services/planExpiry';
import { MAX_DAYS, MUSCLE_GROUPS, type MuscleGroup, type NewPlan } from '../types';

interface PlanFormProps {
  onSubmit: (plan: NewPlan) => void;
  onCancel: () => void;
}

const DAY_LABELS = 'ABCDEFG';
const DEFAULT_NAME = 'Meu plano';

const INITIAL_DAYS = 2;
const EXPIRY_PRESETS = [
  { label: '4 sem', days: 28 },
  { label: '8 sem', days: 56 },
  { label: '12 sem', days: 84 },
];

export function PlanForm({ onSubmit, onCancel }: PlanFormProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  // Prazo opcional: ausente = sem prazo; `presetDays` marca o atalho usado (data fixada no toque).
  const [expiresAt, setExpiresAt] = useState<string | undefined>(undefined);
  const [presetDays, setPresetDays] = useState<number | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [groupsByDay, setGroupsByDay] = useState<MuscleGroup[][]>(() =>
    Array.from({ length: INITIAL_DAYS }, () => []),
  );
  // Os grupos são opcionais: só o primeiro treino começa aberto.
  const [openDay, setOpenDay] = useState<number | null>(0);

  const addDay = () => {
    setGroupsByDay((current) => [...current, []]);
    setOpenDay(groupsByDay.length);
  };

  const removeDay = (dayIndex: number) => {
    // Os treinos são religados em sequência (A, C vira A, B), sem buracos.
    setGroupsByDay((current) => current.filter((_, index) => index !== dayIndex));
    setOpenDay(null);
  };

  const confirmRemoveDay = (dayIndex: number) => {
    if (groupsByDay[dayIndex].length === 0) {
      removeDay(dayIndex);
      return;
    }
    Alert.alert(`Excluir treino ${DAY_LABELS[dayIndex]}?`, 'Os grupos escolhidos serão perdidos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => removeDay(dayIndex) },
    ]);
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
      expiresAt,
      days: groupsByDay.map((muscleGroups, index) => ({
        label: DAY_LABELS[index],
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

        <Text style={styles.label}>PRAZO (OPCIONAL)</Text>
        <View style={styles.row}>
          <Pressable
            onPress={() => {
              setExpiresAt(undefined);
              setPresetDays(null);
            }}
            style={[styles.chip, !expiresAt && styles.chipSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected: !expiresAt }}
          >
            <Text style={[styles.chipText, !expiresAt && styles.chipTextSelected]}>Sem prazo</Text>
          </Pressable>
          {EXPIRY_PRESETS.map((preset) => {
            const selected = presetDays === preset.days;
            return (
              <Pressable
                key={preset.days}
                onPress={() => {
                  setExpiresAt(dateKeyFromToday(preset.days));
                  setPresetDays(preset.days);
                }}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setIsPickerOpen(true)}
            style={[styles.chip, !!expiresAt && presetDays === null && styles.chipSelected]}
            accessibilityRole="button"
            accessibilityLabel="Escolher data do prazo"
          >
            <Text
              style={[
                styles.chipText,
                !!expiresAt && presetDays === null && styles.chipTextSelected,
              ]}
            >
              Data…
            </Text>
          </Pressable>
        </View>
        {expiresAt && <Text style={styles.hint}>Vence em {formatDateKey(expiresAt)}</Text>}

        <Text style={styles.label}>TREINOS</Text>
        {groupsByDay.map((groups, dayIndex) => {
          const isOpen = openDay === dayIndex;
          const letter = DAY_LABELS[dayIndex];
          return (
            <View key={dayIndex} style={styles.dayBox}>
              <View style={styles.dayHeaderRow}>
                <Pressable
                  onPress={() => setOpenDay(isOpen ? null : dayIndex)}
                  style={styles.dayHeader}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  accessibilityLabel={`Treino ${letter}`}
                >
                  <Text style={styles.dayTitle}>{letter}</Text>
                  <Text style={styles.daySummary} numberOfLines={1}>
                    {groups.length > 0 ? groups.join(' · ') : 'Sem grupos'}
                  </Text>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
                {groupsByDay.length > 1 && (
                  <Pressable
                    onPress={() => confirmRemoveDay(dayIndex)}
                    style={styles.removeButton}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel={`Excluir treino ${letter}`}
                  >
                    <Ionicons name="close" size={20} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
              {isOpen && (
                <>
                  <Text style={styles.hint}>Grupos musculares (opcional)</Text>
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
                          accessibilityLabel={`${group}, treino ${letter}`}
                        >
                          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                            {group}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          );
        })}

        {groupsByDay.length < MAX_DAYS ? (
          <Pressable
            onPress={addDay}
            style={styles.addButton}
            accessibilityRole="button"
            accessibilityLabel="Adicionar treino"
          >
            <Ionicons name="add" size={20} color={colors.accent} />
            <Text style={styles.addText}>Adicionar treino</Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>Máximo de {MAX_DAYS} treinos</Text>
        )}
      </ScrollView>

      {isPickerOpen && (
        <ExpirySheet
          visible
          value={expiresAt}
          onConfirm={(next) => {
            setExpiresAt(next);
            setPresetDays(null);
            setIsPickerOpen(false);
          }}
          onClose={() => setIsPickerOpen(false)}
        />
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <PrimaryButton label="Criar plano" onPress={handleSubmit} />
      </View>
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
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
  },
  addButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  addText: {
    color: colors.accent,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
  },
  dayHeader: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayTitle: {
    color: colors.accent,
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
