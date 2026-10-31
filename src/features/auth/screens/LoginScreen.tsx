import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, type ComponentRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { fontSize, fonts, radius, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import { firebaseDiagnostics } from '../../../shared/firebase/firebase';
import { authErrorCode, authErrorMessage } from '../services/authErrors';

interface LoginScreenProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen({ onSignIn, onResetPassword }: LoginScreenProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    setDetail(null);
    setInfo(null);
    try {
      await onSignIn(email, password);
    } catch (failure) {
      setError(authErrorMessage(failure));
      setDetail(`${authErrorCode(failure)} · ${firebaseDiagnostics()}`);
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (busy) return;
    setError(null);
    setInfo(null);
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Digite o seu e-mail acima para receber o link de redefinição.');
      return;
    }
    setBusy(true);
    try {
      await onResetPassword(email);
      // A mesma frase em qualquer caso, para não revelar quais contas existem.
      setInfo('Se esse e-mail tiver conta, enviamos o link de redefinição.');
    } catch (failure) {
      const message = authErrorMessage(failure);
      // Só mostra erro de rede; o resto cai na mensagem neutra.
      if (message.startsWith('Sem conexão')) setError(message);
      else setInfo('Se esse e-mail tiver conta, enviamos o link de redefinição.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <Ionicons name="barbell" size={64} color={colors.accent} />
          <Text style={styles.title}>BeeRR</Text>
          <Text style={styles.subtitle}>Entre para guardar seus treinos com segurança.</Text>
        </View>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          editable={!busy}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          placeholder="voce@email.com"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="E-mail"
        />

        <Text style={styles.label}>Senha</Text>
        <View style={styles.passwordRow}>
          <TextInput
            ref={passwordRef}
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            editable={!busy}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={submit}
            placeholder="Sua senha"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Senha"
          />
          <Pressable
            onPress={() => setShowPassword((visible) => !visible)}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        {error && (
          <View style={styles.message} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <View style={styles.errorBody}>
              <Text style={styles.errorText}>{error}</Text>
              {detail && (
                <Text style={styles.detailText} selectable>
                  Detalhe: {detail}
                </Text>
              )}
            </View>
          </View>
        )}
        {info && (
          <View style={styles.message} accessibilityLiveRegion="polite">
            <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
            <Text style={styles.infoText}>{info}</Text>
          </View>
        )}

        <PrimaryButton label="Entrar" onPress={submit} disabled={!canSubmit} loading={busy} style={styles.submit} />

        <Pressable
          onPress={resetPassword}
          style={styles.link}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Esqueci minha senha"
        >
          <Text style={styles.linkText}>Esqueci minha senha</Text>
        </Pressable>

        <Text style={styles.footnote}>Não tem conta? Peça ao responsável pelo app.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 24,
      gap: 8,
    },
    brand: {
      alignItems: 'center',
      gap: 8,
      marginBottom: 24,
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
      textAlign: 'center',
    },
    label: {
      color: colors.textMuted,
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.sm,
      marginTop: 8,
    },
    input: {
      minHeight: 52,
      paddingHorizontal: 16,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: fontSize.md,
    },
    passwordRow: {
      justifyContent: 'center',
    },
    passwordInput: {
      paddingRight: 52,
    },
    eye: {
      position: 'absolute',
      right: 4,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    message: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 8,
    },
    errorBody: {
      flex: 1,
      gap: 4,
    },
    detailText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: fontSize.xs,
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      lineHeight: 18,
    },
    infoText: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      lineHeight: 18,
    },
    submit: {
      marginTop: 16,
    },
    link: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    linkText: {
      color: colors.accent,
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.md,
    },
    footnote: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      textAlign: 'center',
      marginTop: 8,
    },
  });
