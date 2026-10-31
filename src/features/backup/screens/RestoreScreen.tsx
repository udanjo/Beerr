import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { fontSize, fonts, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';

const SLOW_AFTER_MS = 10000;

interface RestoreScreenProps {
  failed: boolean;
  onRetry: () => void;
  onSkip: () => void;
}

export function RestoreScreen({ failed, onRetry, onSkip }: RestoreScreenProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (failed) return;
    setSlow(false);
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [failed]);

  const showActions = failed || slow;

  return (
    <View style={styles.container}>
      {failed ? (
        <Ionicons name="cloud-offline-outline" size={56} color={colors.textMuted} />
      ) : (
        <ActivityIndicator size="large" color={colors.accent} />
      )}
      <Text style={styles.title}>
        {failed ? 'Não foi possível restaurar' : 'Restaurando seus treinos…'}
      </Text>
      <Text style={styles.text}>
        {failed
          ? 'Verifique sua conexão com a internet e tente de novo.'
          : slow
            ? 'Está demorando mais que o normal.'
            : 'Buscando seus planos e treinos salvos.'}
      </Text>

      {showActions && (
        <View style={styles.actions}>
          <PrimaryButton label="Tentar de novo" onPress={onRetry} />
          <Pressable
            onPress={onSkip}
            style={styles.skip}
            accessibilityRole="button"
            accessibilityLabel="Continuar sem restaurar"
          >
            <Text style={styles.skipText}>Continuar sem restaurar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 32,
      backgroundColor: colors.background,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.xl,
      textAlign: 'center',
    },
    text: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: fontSize.md,
      lineHeight: 24,
      textAlign: 'center',
    },
    actions: {
      alignSelf: 'stretch',
      marginTop: 16,
      gap: 4,
    },
    skip: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipText: {
      color: colors.textMuted,
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.md,
    },
  });
