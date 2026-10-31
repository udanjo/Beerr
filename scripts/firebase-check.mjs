// Teste de conexão com o Firebase: login, gravação/leitura na própria pasta e bloqueio da pasta alheia.
// Uso (no terminal, na raiz do projeto): node scripts/firebase-check.mjs
// E-mail e senha são digitados no terminal; nada é salvo em arquivo.
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { deleteDoc, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';

function loadEnv() {
  const env = {};
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (text) => {
        if (text.startsWith(question)) process.stdout.write(question);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

const env = loadEnv();
const app = initializeApp({
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

const email = await ask('E-mail: ');
const password = await ask('Senha: ', true);

try {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  console.log(`1. Login OK (UID ${user.uid})`);

  const own = doc(db, 'users', user.uid, 'probe', 'check');
  await setDoc(own, { at: new Date().toISOString() });
  const snapshot = await getDoc(own);
  console.log(`2. Gravar e ler na própria pasta: ${snapshot.exists() ? 'OK' : 'FALHOU'}`);
  await deleteDoc(own);

  try {
    await getDoc(doc(db, 'users', 'outra-pessoa', 'probe', 'check'));
    console.log('3. Ler a pasta de outra pessoa: PERMITIDO (as regras estão erradas!)');
  } catch (error) {
    console.log(`3. Ler a pasta de outra pessoa: bloqueado, como esperado (${error.code})`);
  }
  await signOut(auth);
} catch (error) {
  console.log(`Erro: ${error.code ?? error.message}`);
  process.exitCode = 1;
}
process.exit();
