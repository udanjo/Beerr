import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import { imageUrl } from '../services/exerciseLibrary';

interface ExerciseAnimationProps {
  images: string[];
  style?: StyleProp<ViewStyle>;
}

const FRAME_INTERVAL_MS = 800;

/** Alterna as imagens (posição inicial e final) para simular a animação do exercício. */
export function ExerciseAnimation({ images, style }: ExerciseAnimationProps) {
  const { styles } = useThemedStyles(makeStyles);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => setFrame((current) => (current + 1) % images.length), FRAME_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <View style={[styles.container, style]}>
      {images.map((path, index) => (
        <Image
          key={path}
          source={{ uri: imageUrl(path) }}
          style={[styles.image, index !== frame && styles.hidden]}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
      ))}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    overflow: 'hidden',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
  hidden: {
    opacity: 0,
  },
  });
