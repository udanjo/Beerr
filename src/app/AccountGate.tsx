import { View } from 'react-native';

import { useAuth } from '../features/auth/hooks/useAuth';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { useRestore } from '../features/backup/hooks/useRestore';
import { RestoreScreen } from '../features/backup/screens/RestoreScreen';
import { useTheme } from '../shared/theme/ThemeContext';
import { AppLockGate } from './AppLockGate';
import { AppShell } from './AppShell';

const LOCAL_UID = 'local';

/** Decide o que mostrar antes do app: login, restauração dos dados da conta ou o próprio app. */
export function AccountGate() {
  const { colors } = useTheme();
  const { state, signIn, signOut, resetPassword } = useAuth();

  if (state.status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (state.status === 'signedOut') {
    return <LoginScreen onSignIn={signIn} onResetPassword={resetPassword} />;
  }
  if (state.status === 'local') {
    return (
      <AppLockGate>
        <AppShell uid={LOCAL_UID} cloud={false} email={null} onSignOut={signOut} />
      </AppLockGate>
    );
  }
  return <SignedInApp uid={state.uid} email={state.email} onSignOut={signOut} />;
}

function SignedInApp({
  uid,
  email,
  onSignOut,
}: {
  uid: string;
  email: string | null;
  onSignOut: () => Promise<void>;
}) {
  const { colors } = useTheme();
  const restore = useRestore(uid, true);

  if (restore.state === 'checking') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (restore.state !== 'done') {
    return (
      <RestoreScreen
        failed={restore.state === 'failed'}
        onRetry={restore.retry}
        onSkip={restore.skip}
      />
    );
  }
  // O `key` refaz o app inteiro se a conta mudar, sem sobrar dado da conta anterior.
  return (
    <AppLockGate onSignOut={onSignOut}>
      <AppShell key={uid} uid={uid} cloud email={email} onSignOut={onSignOut} />
    </AppLockGate>
  );
}
