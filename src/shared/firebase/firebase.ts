import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Os valores do app web do Firebase não são segredo (quem protege os dados são as
// Security Rules). Ficam em variáveis EXPO_PUBLIC_* (.env.local, fora do git; veja .env.example).
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** Falso enquanto o projeto Firebase não foi configurado; o app segue só com dados locais. */
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let auth: Auth | null = null;
let firestore: Firestore | null = null;

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null;
  if (!auth) {
    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    // Sem a persistência explícita, o login se perderia ao fechar o app.
    auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  }
  return auth;
}

export function getFirebaseFirestore(): Firestore | null {
  if (!isFirebaseConfigured) return null;
  if (!firestore) {
    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    firestore = getFirestore(app);
  }
  return firestore;
}
