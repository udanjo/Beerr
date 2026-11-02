import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { radius, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import { useCustomExercises } from '../hooks/useCustomExercises';
import { getLibraryExercise, imageUrl } from '../services/exerciseLibrary';

interface ExerciseThumbProps {
  libraryId?: string;
  size?: number;
}

/** Miniatura quadrada do exercício; sem imagem quando o exercício foi digitado à mão. */
export function ExerciseThumb({ libraryId, size = 76 }: ExerciseThumbProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  // Relê quando os exercícios personalizados mudam (criar, editar, excluir).
  useCustomExercises();
  const exercise = libraryId ? getLibraryExercise(libraryId) : undefined;
  const firstImage = exercise?.images[0];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {exercise?.custom && (
        <View style={styles.placeholder}>
          <Ionicons name="barbell" size={Math.round(size * 0.5)} color={colors.accent} />
        </View>
      )}
      {firstImage && (
        <Image
          source={{ uri: imageUrl(firstImage) }}
          style={styles.image}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    opacity: 1,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  });
