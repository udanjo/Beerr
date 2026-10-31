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

export interface AccountInfo {
  email: string | null;
  lastBackupAt?: string;
  pending: boolean;
  syncing: boolean;
  error?: string;
  onBackupNow: () => void;
  onSignOut: () => void;
}

function formatBackupTime(iso: string | undefined): string {
  if (!iso) return 'Nunca';
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const today = new Date();
  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  return sameDay ? `hoje, ${time}` : `${pad(date.getDate())}/${pad(date.getMonth() + 1)}, ${time}`;
}

interface SettingsScreenProps {
  /** Conta logada e backup; ausente quando o build não tem Firebase configurado. */
  account: AccountInfo | null;
  appLockEnabled: boolean;
  onToggleAppLock: (next: boolean) => void;
  notifyExpiry: boolean;
  permissionDenied: boolean;
  onToggleNotifyExpiry: (next: boolean) => void;
  allowEditDuringWorkout: boolean;
  onToggleAllowEdit: (next: boolean) => void;
  onClose: () => void;
}

export function SettingsScreen({
  account,
  appLockEnabled,
  onToggleAppLock,
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

        <Text style={styles.sectionLabel}>SEGURANÇA</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Bloquear ao abrir o app</Text>
              <Text style={styles.cardHint}>
                Pede digital, rosto, PIN ou padrão do aparelho ao abrir. Não pede de novo se você
                voltar em até 5 minutos.
              </Text>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={onToggleAppLock}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
              accessibilityLabel="Bloquear ao abrir o app"
            />
          </View>
        </View>

        {account && (
          <>
            <Text style={styles.sectionLabel}>CONTA E BACKUP</Text>
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <Ionicons name="person-circle-outline" size={20} color={colors.textMuted} />
                <Text style={styles.cardHint} selectable>
                  {account.email ?? 'Conta'}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Ionicons
                  name={
                    account.error
                      ? 'alert-circle-outline'
                      : account.syncing
                        ? 'cloud-upload-outline'
                        : account.pending
                          ? 'time-outline'
                          : 'checkmark-circle-outline'
                  }
                  size={20}
                  color={account.error ? colors.danger : colors.textMuted}
                />
                <Text style={styles.cardHint}>
                  {account.syncing
                    ? 'Enviando…'
                    : account.error
                      ? `${account.error} Tentaremos de novo.`
                      : account.pending
                        ? 'Pendente: será enviado quando houver Wi-Fi.'
                        : 'Tudo salvo na nuvem.'}
                </Text>
              </View>
              <Text style={styles.cardHint}>Último backup: {formatBackupTime(account.lastBackupAt)}</Text>

              <Pressable
                onPress={account.onBackupNow}
                disabled={account.syncing}
                style={styles.deniedButton}
                accessibilityRole="button"
                accessibilityState={{ disabled: account.syncing, busy: account.syncing }}
                accessibilityLabel="Fazer backup agora"
              >
                <Text style={styles.deniedButtonText}>
                  {account.syncing ? 'ENVIANDO…' : 'FAZER BACKUP AGORA'}
                </Text>
              </Pressable>
              <Pressable
                onPress={account.onSignOut}
                style={styles.deniedButton}
                accessibilityRole="button"
                accessibilityLabel="Sair da conta"
              >
                <Text style={styles.signOutText}>SAIR DA CONTA</Text>
              </Pressable>
            </View>
          </>
        )}

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
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    signOutText: {
      color: colors.danger,
      fontFamily: fonts.displayBold,
      fontSize: 16,
      letterSpacing: 0.4,
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
