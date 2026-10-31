import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert, AppState, View } from 'react-native';

import { LockScreen } from '../features/settings/screens/LockScreen';
import {
  authenticate,
  loadAppLockEnabled,
  lockAvailable,
  saveAppLockEnabled,
} from '../features/settings/services/biometricLock';
import { useTheme } from '../shared/theme/ThemeContext';

const GRACE_MS = 5 * 60 * 1000;

// Só a abertura do app (processo novo) começa trancada; entrar numa conta depois não pede de novo.
let coldStart = true;

export type EnableResult = 'ok' | 'cancelled' | 'unavailable';

interface AppLockContextValue {
  enabled: boolean;
  enable: () => Promise<EnableResult>;
  disable: () => Promise<boolean>;
  /** Com treino ativo o app nunca é trancado. */
  setTrainingActive: (active: boolean) => void;
}

const AppLockContext = createContext<AppLockContextValue>({
  enabled: false,
  enable: async () => 'unavailable',
  disable: async () => true,
  setTrainingActive: () => undefined,
});

export const useAppLock = () => useContext(AppLockContext);

interface AppLockGateProps {
  children: ReactNode;
  /** Ausente no modo local (sem conta). */
  onSignOut?: () => Promise<void>;
}

/** Cobre o app com a tela de bloqueio sem desmontá-lo, para não perder treino, cronômetro nem abas. */
export function AppLockGate({ children, onSignOut }: AppLockGateProps) {
  const { colors } = useTheme();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const authenticating = useRef(false);
  const trainingActive = useRef(false);
  const backgroundedAt = useRef<number | null>(null);
  const enabledRef = useRef(false);
  const autoPrompted = useRef(false);

  const turnOff = useCallback(async () => {
    enabledRef.current = false;
    setEnabled(false);
    setLocked(false);
    await saveAppLockEnabled(false).catch(() => undefined);
  }, []);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    setBusy(true);
    setMessage(null);
    try {
      // Se o desbloqueio do aparelho foi removido, não tranca o usuário para fora.
      if (!(await lockAvailable())) {
        await turnOff();
        Alert.alert(
          'Bloqueio desativado',
          'O aparelho não tem mais biometria, PIN ou padrão cadastrados. Ative de novo em Configurações.',
        );
        return;
      }
      const result = await authenticate('Desbloquear o BeeRR');
      if (result === 'success') setLocked(false);
      else if (result === 'failed') setMessage('Não reconhecido. Tente de novo.');
      else if (result === 'lockout') setMessage('Muitas tentativas. Tente em alguns instantes.');
    } finally {
      authenticating.current = false;
      setBusy(false);
    }
  }, [turnOff]);

  useEffect(() => {
    loadAppLockEnabled().then((value) => {
      enabledRef.current = value;
      setEnabled(value);
      if (value && coldStart) setLocked(true);
      coldStart = false;
    });
  }, []);

  // Abertura a frio: um único prompt automático; se for cancelado, fica só o botão.
  useEffect(() => {
    if (locked && enabled && !autoPrompted.current) {
      autoPrompted.current = true;
      unlock();
    }
  }, [locked, enabled, unlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (authenticating.current) return;
      if (state === 'background') {
        backgroundedAt.current = Date.now();
        return;
      }
      if (state !== 'active') return;

      const since = backgroundedAt.current;
      backgroundedAt.current = null;
      if (!enabledRef.current || trainingActive.current || since === null) return;
      if (Date.now() - since > GRACE_MS) {
        setLocked(true);
        unlock();
      }
    });
    return () => subscription.remove();
  }, [unlock]);

  const enable = useCallback(async (): Promise<EnableResult> => {
    if (!(await lockAvailable())) return 'unavailable';
    authenticating.current = true;
    try {
      const result = await authenticate('Confirme para ativar o bloqueio');
      if (result !== 'success') return 'cancelled';
    } finally {
      authenticating.current = false;
    }
    await saveAppLockEnabled(true);
    enabledRef.current = true;
    setEnabled(true);
    return 'ok';
  }, []);

  // Desligar também pede autenticação, para ninguém com o celular desbloqueado remover a trava.
  const disable = useCallback(async (): Promise<boolean> => {
    authenticating.current = true;
    try {
      if ((await authenticate('Confirme para desativar o bloqueio')) !== 'success') return false;
    } finally {
      authenticating.current = false;
    }
    await turnOff();
    return true;
  }, [turnOff]);

  const setTrainingActive = useCallback((active: boolean) => {
    trainingActive.current = active;
    // A carência recomeça do fim do treino.
    backgroundedAt.current = null;
  }, []);

  const value = useMemo(
    () => ({ enabled: Boolean(enabled), enable, disable, setTrainingActive }),
    [enabled, enable, disable, setTrainingActive],
  );

  const confirmSignOut = () => {
    if (!onSignOut) return;
    Alert.alert('Sair da conta', 'Seus dados continuam salvos na nuvem e neste aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => onSignOut() },
    ]);
  };

  return (
    <AppLockContext.Provider value={value}>
      {children}
      {enabled === null && (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.background }} />
      )}
      {enabled && locked && (
        <LockScreen
          message={message}
          busy={busy}
          onUnlock={unlock}
          onSignOut={onSignOut ? confirmSignOut : undefined}
        />
      )}
    </AppLockContext.Provider>
  );
}
