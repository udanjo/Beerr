import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '../../../shared/components/BottomSheet';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { fontSize, fonts, radius, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import { MUSCLE_GROUPS, type MuscleGroup } from '../../plans/types';
import { newCustomId, normalizeVideoUrl, saveCustomExercise } from '../services/customExercises';
import { normalizeText, type LibraryExercise } from '../services/exerciseLibrary';

interface CustomExerciseSheetProps {
  /** Exercício a editar; ausente cria um novo. */
  exercise?: LibraryExercise;
  /** Nome sugerido (ex.: texto da busca sem resultado). */
  initialName?: string;
  /** Grupo sugerido (ex.: grupo aberto na biblioteca). */
  initialGroup?: MuscleGroup;
  /** Nomes já usados, para avisar de repetição. */
  existingNames: string[];
  onClose: () => void;
  onSaved: (exercise: LibraryExercise) => void;
}

const NAME_MAX = 60;

export function CustomExerciseSheet({
  exercise,
  initialName = '',
  initialGroup,
  existingNames,
  onClose,
  onSaved,
}: CustomExerciseSheetProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const [name, setName] = useState(exercise?.name ?? initialName.trim().slice(0, NAME_MAX));
  const [group, setGroup] = useState<MuscleGroup | null>(exercise?.group ?? initialGroup ?? null);
  const [equipment, setEquipment] = useState(exercise?.equipment ?? '');
  const [instructions, setInstructions] = useState(exercise?.instructions.join('\n') ?? '');
  const [video, setVideo] = useState(exercise?.videoUrl ?? '');
  const [submitted, setSubmitted] = useState(false);

  const trimmedName = name.trim();
  const nameError = trimmedName ? null : 'Informe o nome do exercício';
  const groupError = group ? null : 'Escolha um grupo muscular';
  const videoUrl = normalizeVideoUrl(video);
  const videoError =
    video.trim() && !videoUrl ? 'Link inválido. Use um endereço como youtube.com/...' : null;
  const duplicate =
    trimmedName.length > 0 &&
    existingNames.some((existing) => normalizeText(existing) === normalizeText(trimmedName));

  const dirty =
    trimmedName !== (exercise?.name ?? '') ||
    group !== (exercise?.group ?? null) ||
    equipment.trim() !== (exercise?.equipment ?? '') ||
    instructions.trim() !== (exercise?.instructions.join('\n') ?? '') ||
    video.trim() !== (exercise?.videoUrl ?? '');

  const requestClose = () => {
    if (!dirty) {
      onClose();
      return;
    }
    Alert.alert('Descartar exercício?', 'O que você digitou será perdido.', [
      { text: 'Continuar editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: onClose },
    ]);
  };

  const handleSave = () => {
    setSubmitted(true);
    if (nameError || groupError || videoError || !group) return;
    const saved: LibraryExercise = {
      id: exercise?.id ?? newCustomId(),
      name: trimmedName,
      group,
      target: group,
      secondary: [],
      equipment: equipment.trim() || null,
      level: '',
      instructions: instructions
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      images: [],
      custom: true,
      videoUrl: videoUrl ?? undefined,
    };
    saveCustomExercise(saved).catch(() => undefined);
    onSaved(saved);
  };

  return (
    <BottomSheet visible onClose={requestClose}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{exercise ? 'Editar exercício' : 'Criar exercício'}</Text>

        <Text style={styles.label}>NOME</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          maxLength={NAME_MAX}
          placeholder="Ex.: Supino na máquina X"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Nome do exercício"
        />
        {submitted && nameError && <Text style={styles.error}>{nameError}</Text>}
        {!nameError && duplicate && (
          <Text style={styles.warning}>Já existe um exercício com esse nome</Text>
        )}

        <Text style={styles.label}>GRUPO MUSCULAR</Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {MUSCLE_GROUPS.map((option) => {
            const selected = group === option;
            return (
              <Pressable
                key={option}
                onPress={() => setGroup(option)}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option}
              >
                {selected && <Ionicons name="checkmark" size={16} color={colors.onPrimary} />}
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
        {submitted && groupError && <Text style={styles.error}>{groupError}</Text>}

        <Text style={styles.label}>EQUIPAMENTO (OPCIONAL)</Text>
        <TextInput
          style={styles.input}
          value={equipment}
          onChangeText={setEquipment}
          maxLength={40}
          placeholder="Ex.: Máquina, halter, barra"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Equipamento"
        />

        <Text style={styles.label}>COMO FAZER (OPCIONAL)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={instructions}
          onChangeText={setInstructions}
          multiline
          maxLength={600}
          placeholder="Um passo por linha"
          placeholderTextColor={colors.textMuted}
          textAlignVertical="top"
          accessibilityLabel="Instruções do exercício"
        />

        <Text style={styles.label}>LINK DO VÍDEO (OPCIONAL)</Text>
        <TextInput
          style={styles.input}
          value={video}
          onChangeText={setVideo}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="youtube.com/..."
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Link do vídeo"
        />
        {videoError && <Text style={styles.error}>{videoError}</Text>}

        <PrimaryButton label="Salvar exercício" onPress={handleSave} style={styles.save} />
      </ScrollView>
    </BottomSheet>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    title: {
      color: colors.text,
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.lg,
      marginBottom: 8,
    },
    label: {
      color: colors.textMuted,
      fontFamily: fonts.displayBold,
      fontSize: 16,
      letterSpacing: 0.4,
      marginTop: 16,
      marginBottom: 8,
    },
    input: {
      minHeight: 48,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: fontSize.md,
    },
    multiline: {
      minHeight: 96,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 16,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
    },
    chipSelected: {
      backgroundColor: colors.primary,
    },
    chipText: {
      color: colors.text,
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.md,
    },
    chipTextSelected: {
      color: colors.onPrimary,
    },
    error: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      marginTop: 6,
    },
    warning: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      marginTop: 6,
    },
    save: {
      marginTop: 24,
      marginBottom: 8,
    },
  });
