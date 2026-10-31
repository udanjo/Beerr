import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';

import { getFirebaseAuth } from '../../../shared/firebase/firebase';

export type AuthState =
  | { status: 'loading' }
  /** Firebase não configurado neste build: o app segue só com dados locais. */
  | { status: 'local' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; uid: string; email: string | null };

export function useAuth() {
  const [state, setState] = useState<AuthState>(() =>
    getFirebaseAuth() ? { status: 'loading' } : { status: 'local' },
  );

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    // A sessão fica salva no aparelho: reabrir o app (mesmo sem internet) já entra logado.
    return onAuthStateChanged(auth, (user) =>
      setState(user ? { status: 'signedIn', uid: user.uid, email: user.email } : { status: 'signedOut' }),
    );
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('firebase-not-configured');
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (auth) await firebaseSignOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('firebase-not-configured');
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  return { state, signIn, signOut, resetPassword };
}
