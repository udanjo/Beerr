# BeeRR

App de treino de academia em português (pt-BR), com tema escuro em verde neon (e opção de tema claro), inspirado no BeFit. Feito com Expo SDK 58, React Native 0.88, React 19 e TypeScript.

## Funcionalidades

- **Planos de treino**: vários planos, cada um com treinos (A, B, ...) livres, grupos musculares e exercícios com séries, repetições, carga, descanso e observações.
- **Prazo do plano**: data de vencimento opcional, aviso por notificação 2 dias antes (às 09:00) e seção "Vencidos" no seletor de planos. Planos vencidos podem ser reativados com +30/+60/+90 dias, data própria ou sem prazo.
- **Treino em execução**: séries marcadas uma a uma, cronômetro de descanso, duração e volume ao vivo. Carga e repetições vêm preenchidas do último treino do exercício.
- **Editar treino durante a execução** (opcional, em Configurações): substituir ou adicionar exercícios enquanto treina. Ao finalizar, o app pergunta se o plano de origem deve ser atualizado.
- **Histórico e progresso**: treinos salvos e estatísticas calculadas a partir deles.
- **Biblioteca de exercícios**: 873 exercícios em português, com busca (ignora acentos) e filtro por grupo muscular. As imagens carregam da internet na primeira visualização.
- **Contas e backup**: login com e-mail e senha (as contas são criadas pelo responsável no console do Firebase; não há cadastro no app). Cada conta tem os próprios planos e treinos. O app grava sempre no aparelho, funciona sem internet e envia o backup para o Firestore quando há Wi-Fi. Em um aparelho novo, entrar na conta restaura os dados.
- **Configurações**: tema (escuro, claro ou sistema), conta e backup (estado, "Fazer backup agora", sair), aviso de vencimento do plano e edição do treino durante a execução.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha com os dados do app web do Firebase
npx expo start               # escaneie o QR code com o Expo Go no celular
```

Sem o `.env.local`, o app abre sem login e sem backup, só com dados locais. O passo a passo da configuração do Firebase (contas, Firestore e regras de segurança) está em `docs/firebase-passo-a-passo.html`.

Verificações:

```bash
npx tsc --noEmit                    # checagem de tipos
npx expo export --platform android  # confere se o bundle compila
```

## Gerar o APK

O workflow `.github/workflows/build-apk.yml` compila o APK de release (arm64) no GitHub Actions. Ele roda ao enviar uma tag `v*` (por exemplo, `v1.2.0`) ou manualmente em *Actions → Build APK → Run workflow*. O APK fica disponível como artefato `beerr-apk`.

Os dados do Firebase entram no build pelas variáveis `EXPO_PUBLIC_FIREBASE_*` (API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID e APP_ID), cadastradas em *Settings → Secrets and variables → Actions → Variables*, sem aspas nem vírgulas. Sem elas o APK sai sem login e sem backup.

Ao publicar uma versão, atualize `version` em `app.json` e `package.json` e incremente `android.versionCode`.

## Estrutura

```
src/
  app/AccountGate.tsx   login, restauração dos dados e entrada no app
  app/AppShell.tsx      navegação por estado (abas e treino em execução)
  features/
    auth/               login (Firebase Auth)
    backup/             backup e restauração (Firestore)
    plans/              planos, treinos, exercícios e prazos
    exercises/          biblioteca de exercícios
    sessions/           treino em execução, histórico e progresso
    settings/           configurações e avisos
  shared/               tema, Firebase e componentes reutilizáveis
docs/                   roadmap e guia do Firebase
scripts/                teste de conexão com o Firebase
```

Os dados ficam no aparelho (AsyncStorage), separados por conta. O Firebase (Auth e Firestore) guarda apenas o backup; as regras de segurança permitem que cada pessoa acesse somente `users/{seu UID}`.

## Créditos

Exercícios: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense), com tradução CC0 de `gugeldev/exercicios-bd-ptbr`.
