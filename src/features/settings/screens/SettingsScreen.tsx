import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SegmentedTabs } from '../../../shared/components/SegmentedTabs';
import { fontSize, fonts, radius, type Palette } from '../../../shared/theme';
import {
  type ThemePreference,
  useTheme,
  useThemedStyles,
} from '../../../shared/theme/ThemeContext';
import { REMINDER_DAYS_BEFORE, REMINDER_HOUR } from '../services/expiryReminders';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'dark', label: 'Escuro' },
  { value: 'light', label: 'Claro' },
  { value: 'system', label: 'Sistema' },
];

const VERSION = Constants.expoConfig?.version ?? '—';
const BUILD = Constants.expoConfig?.android?.versionCode;

interface SettingsScreenProps {
  notifyExpiry: boolean;
  permissionDenied: boolean;
  onToggleNotifyExpiry: (next: boolean) => void;
  allowEditDuringWorkout: boolean;
  onToggleAllowEdit: (next: boolean) => void;
  onClose: () => void;
}

export function SettingsScreen({
  notifyExpiry,
  permissionDenied,
  onToggleNotifyExpiry,
  allowEditDuringWorkout,
  onToggleAllowEdit,
  onClose,
}: SettingsScreenProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const { preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.heading}>Configurações</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>APARÊNCIA</Text>
        <SegmentedTabs options={THEME_OPTIONS} value={preference} onChange={setPreference} />

        <Text style={styles.sectionLabel}>TREINO</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Editar treino durante a execução</Text>
              <Text style={styles.cardHint}>
                Permite substituir ou adicionar exercícios enquanto você treina. Ao finalizar, o app
                pergunta se quer atualizar o plano.
              </Text>
            </View>
            <Switch
              value={allowEditDuringWorkout}
              onValueChange={onToggleAllowEdit}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
              accessibilityLabel="Editar treino durante a execução"
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>AVISOS</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Avisar antes do plano vencer</Text>
              <Text style={styles.cardHint}>
                Você receberá uma notificação {REMINDER_DAYS_BEFORE} dias antes, às{' '}
                {String(REMINDER_HOUR).padStart(2, '0')}:00. Só vale para planos com prazo.
              </Text>
            </View>
            <Switch
              value={notifyExpiry}
              onValueChange={onToggleNotifyExpiry}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
              accessibilityLabel="Avisar antes do plano vencer"
            />
          </View>
          {permissionDenied && (
            <View style={styles.denied}>
              <Text style={styles.deniedText}>
                Notificações bloqueadas. Libere nos ajustes do sistema para receber os avisos.
              </Text>
              <Pressable
                onPress={() => Linking.openSettings()}
                style={styles.deniedButton}
                accessibilityRole="button"
              >
                <Text style={styles.deniedButtonText}>ABRIR AJUSTES</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>SOBRE O APP</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>BeeRR</Text>
          <Text style={styles.cardHint} selectable>
            Versão {VERSION}
            {BUILD !== undefined ? ` (build ${BUILD})` : ''}
          </Text>
          <Text style={styles.cardHint}>
            Exercícios: free-exercise-db (Unlicense); tradução CC0 gugeldev/exercicios-bd-ptbr.
          </Text>
        </View>
      </ScrollView>
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
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heading: {
      color: colors.text,
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.lg,
    },
    content: {
      padding: 20,
      gap: 12,
    },
    sectionLabel: {
      color: colors.textMuted,
      fontFamily: fonts.displayBold,
      fontSize: 16,
      letterSpacing: 0.4,
      marginTop: 8,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 16,
      gap: 12,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cardText: {
      flex: 1,
      gap: 4,
    },
    cardTitle: {
      color: colors.text,
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.md,
    },
    cardHint: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      lineHeight: 18,
    },
    denied: {
      gap: 8,
    },
    deniedText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
    },
    deniedButton: {
      minHeight: 44,
      justifyContent: 'center',
    },
    deniedButtonText: {
      color: colors.accent,
      fontFamily: fonts.displayBold,
      fontSize: 16,
      letterSpacing: 0.4,
    },
  });
