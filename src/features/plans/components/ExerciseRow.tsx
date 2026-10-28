import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontSize, fonts, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import { ExerciseThumb } from '../../exercises/components/ExerciseThumb';
import type { Exercise } from '../types';

interface ExerciseRowProps {
  exercise: Exercise;
  onPress: (exerciseId: string) => void;
}

/** "4 sets • 12 reps • 50 kg"; mostra faixas quando as séries diferem entre si. */
function summarize(exercise: Exercise): string {
  const { sets } = exercise;
  const range = (values: number[]) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return min === max ? `${min}` : `${min}~${max}`;
  };

  const parts = [`${sets.length} ${sets.length === 1 ? 'série' : 'séries'}`];
  parts.push(`${range(sets.map((set) => set.reps))} reps`);
  const weights = sets.map((set) => set.weight);
  if (Math.max(...weights) > 0) parts.push(`${range(weights)} kg`);
  return parts.join(' • ');
}

function ExerciseRowComponent({ exercise, onPress }: ExerciseRowProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={() => onPress(exercise.id)}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`${exercise.name}, ${summarize(exercise)}`}
      accessibilityHint="Abre as séries do exercício"
    >
      <ExerciseThumb libraryId={exercise.libraryId} size={64} />
      <View style={styles.text}>
        <Text style={styles.name}>{exercise.name}</Text>
        <Text style={styles.summary}>{summarize(exercise)}</Text>
      </View>
      <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

export const ExerciseRow = memo(ExerciseRowComponent);

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  text: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.lg,
  },
  summary: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
  },
  });
