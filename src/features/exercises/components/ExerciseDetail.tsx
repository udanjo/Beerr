import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SegmentedTabs } from '../../../shared/components/SegmentedTabs';
import { fontSize, fonts, radius, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import { getLibraryExercise, type LibraryExercise } from '../services/exerciseLibrary';
import { ExerciseAnimation } from './ExerciseAnimation';

type DetailTab = 'target' | 'instructions' | 'equipment';

const TABS: { value: DetailTab; label: string }[] = [
  { value: 'target', label: 'Alvo' },
  { value: 'instructions', label: 'Instruções' },
  { value: 'equipment', label: 'Equipamento' },
];

interface ExerciseDetailModalProps {
  libraryId: string | null;
  onClose: () => void;
}

export function ExerciseDetailModal({ libraryId, onClose }: ExerciseDetailModalProps) {
  const exercise = libraryId ? getLibraryExercise(libraryId) : undefined;

  return (
    <Modal
      visible={exercise !== undefined}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {exercise && <ExerciseDetail exercise={exercise} onClose={onClose} />}
    </Modal>
  );
}

function ExerciseDetail({ exercise, onClose }: { exercise: LibraryExercise; onClose: () => void }) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<DetailTab>('target');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} bounces={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <ExerciseAnimation images={exercise.images} style={styles.animation} />
        </View>

        <View style={styles.panel}>
          <View style={styles.tags}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{exercise.target.toUpperCase()}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{exercise.level.toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.title}>{exercise.name}</Text>

          <SegmentedTabs options={TABS} value={tab} onChange={setTab} />

          <View style={styles.tabContent}>
            {tab === 'target' && (
              <>
                <Text style={styles.sectionLabel}>PRIMÁRIO</Text>
                <Text style={styles.value}>{exercise.target}</Text>
                {exercise.secondary.length > 0 && (
                  <>
                    <Text style={[styles.sectionLabel, styles.sectionGap]}>SECUNDÁRIOS</Text>
                    {exercise.secondary.map((muscle) => (
                      <Text key={muscle} style={styles.value}>
                        {muscle}
                      </Text>
                    ))}
                  </>
                )}
              </>
            )}

            {tab === 'instructions' &&
              exercise.instructions.map((step, index) => (
                <View key={index} style={styles.step}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}

            {tab === 'equipment' && (
              <>
                <Text style={styles.sectionLabel}>EQUIPAMENTO</Text>
                <Text style={styles.value}>{exercise.equipment ?? 'Nenhum'}</Text>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <Pressable
        onPress={onClose}
        style={[styles.backButton, { top: insets.top + 12 }]}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <Ionicons name="chevron-back" size={26} color={colors.white} />
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    backgroundColor: colors.white,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  animation: {
    width: '100%',
    borderWidth: 0,
    borderRadius: 0,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(60, 60, 60, 0.85)',
  },
  panel: {
    marginTop: -28,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: 20,
    gap: 16,
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  tagText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    letterSpacing: 0.4,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xxl,
    lineHeight: 40,
  },
  tabContent: {
    paddingTop: 8,
    gap: 8,
  },
  sectionLabel: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    letterSpacing: 0.4,
  },
  sectionGap: {
    marginTop: 16,
  },
  value: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: fontSize.lg,
  },
  step: {
    flexDirection: 'row',
    gap: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepNumber: {
    width: 20,
    color: colors.text,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.lg,
  },
  stepText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  });
