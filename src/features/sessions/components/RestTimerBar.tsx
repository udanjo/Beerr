import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, radius, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';

interface RestTimerBarProps {
  remaining: number;
  total: number;
  onAddTime: (seconds: number) => void;
  onSkip: () => void;
}

const ADD_SECONDS = 15;

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function RestTimerBar({ remaining, total, onAddTime, onSkip }: RestTimerBarProps) {
  const { styles } = useThemedStyles(makeStyles);
  const progress = total > 0 ? Math.min(1, remaining / total) : 0;

  return (
    <View
      style={styles.container}
      accessibilityRole="timer"
      accessibilityLabel={`Descanso, faltam ${remaining} segundos`}
    >
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>DESCANSO</Text>
          <Text style={styles.time}>{formatTime(remaining)}</Text>
        </View>
        <View style={styles.buttons}>
          <Pressable
            onPress={() => onAddTime(-ADD_SECONDS)}
            style={styles.button}
            accessibilityRole="button"
            accessibilityLabel={`Remover ${ADD_SECONDS} segundos`}
          >
            <Text style={styles.buttonText}>-{ADD_SECONDS}S</Text>
          </Pressable>
          <Pressable
            onPress={() => onAddTime(ADD_SECONDS)}
            style={styles.button}
            accessibilityRole="button"
            accessibilityLabel={`Adicionar ${ADD_SECONDS} segundos`}
          >
            <Text style={styles.buttonText}>+{ADD_SECONDS}S</Text>
          </Pressable>
          <Pressable
            onPress={onSkip}
            style={[styles.button, styles.skipButton]}
            accessibilityRole="button"
            accessibilityLabel="Pular descanso"
          >
            <Text style={[styles.buttonText, styles.skipText]}>PULAR</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  time: {
    color: colors.accent,
    fontFamily: fonts.displayBold,
    fontSize: 30,
    lineHeight: 32,
    fontVariant: ['tabular-nums'],
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    minHeight: 44,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  buttonText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    letterSpacing: 0.4,
  },
  skipButton: {
    backgroundColor: colors.primary,
  },
  skipText: {
    color: colors.onPrimary,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  });
