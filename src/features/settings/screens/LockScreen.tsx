import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { fontSize, fonts, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';

interface LockScreenProps {
  message: string | null;
  busy: boolean;
  onUnlock: () => void;
  /** Ausente quando não há conta (modo local). */
  onSignOut?: () => void;
}

export function LockScreen({ message, busy, onUnlock, onSignOut }: LockScreenProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.brand}>
        <Ionicons name="barbell" size={72} color={colors.accent} />
        <Text style={styles.title}>BeeRR</Text>
        <Text style={styles.subtitle}>App bloqueado</Text>
        {message && (
          <Text style={styles.message} accessibilityLiveRegion="polite">
            {message}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Desbloquear" onPress={onUnlock} loading={busy} />
        {onSignOut && (
          <Pressable
            onPress={onSignOut}
            style={styles.signOut}
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
          >
            <Text style={styles.signOutText}>Sair da conta</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFill,
      zIndex: 100,
      elevation: 100,
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      backgroundColor: colors.background,
    },
    brand: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.displayBold,
      fontSize: 40,
      letterSpacing: 1,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: fontSize.md,
    },
    message: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      textAlign: 'center',
      marginTop: 12,
    },
    actions: {
      gap: 4,
    },
    signOut: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signOutText: {
      color: colors.textMuted,
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.md,
    },
  });
