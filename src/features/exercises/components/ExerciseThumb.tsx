import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../../../shared/theme';
import { getLibraryExercise, imageUrl } from '../services/exerciseLibrary';

interface ExerciseThumbProps {
  libraryId?: string;
  size?: number;
}

/** Miniatura quadrada do exercício; sem imagem quando o exercício foi digitado à mão. */
export function ExerciseThumb({ libraryId, size = 76 }: ExerciseThumbProps) {
  const exercise = libraryId ? getLibraryExercise(libraryId) : undefined;
  const firstImage = exercise?.images[0];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    opacity: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
