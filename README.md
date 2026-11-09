# BeeRR

App de treino de academia em português (pt-BR), com tema escuro em verde neon (e opção de tema claro), inspirado no BeFit. Feito com Expo SDK 58, React Native 0.88, React 19 e TypeScript.

## Funcionalidades

- **Planos de treino**: vários planos, cada um com treinos (A, B, ...) livres, grupos musculares e exercícios com séries, repetições, carga, descanso (ou "Sem descanso") e observações.
- **Adicionar, renomear e excluir treinos**: dentro de um plano já criado, o botão "+ NOVO" ao lado das abas cria o próximo treino (B, C, ...), e "EDITAR" abre o nome, os grupos musculares e a exclusão (com confirmação e contagem dos exercícios). O histórico não muda ao renomear ou excluir.
- **Exercícios por tempo**: na edição do exercício, a opção "Por tempo" troca repetições por segundos (de 5 em 5, padrão 30 s). No treino, o botão de play inicia uma pré-contagem de 3 s e depois a contagem regressiva na própria série, com pausar e cancelar; ao zerar, vibra, toca um bip, marca a série e inicia o descanso. Dá para marcar sem cronometrar mantendo o play pressionado. O histórico mostra "30 s" e o volume ignora esses exercícios. Cardio (grupo Cardio da biblioteca) e Prancha já entram em modo tempo, e durante o treino dá para alternar tempo/repetições enquanto nenhuma série do exercício estiver concluída.
- **Peso total ou por lado**: ao editar uma série, o seletor "Total / Por lado" acima das repetições informa se a carga é a soma ou a de cada halter/mão. Vale para o exercício todo (padrão: total) e aparece como "kg por lado" no plano e no histórico. O volume não é dobrado. O "Última vez" só preenche de treinos no mesmo modo.
- **Reordenar exercicios**: no plano, o modo REORDENAR move exercicios com setas de subir e descer. No treino (com a edicao durante a execucao ligada), cada exercicio pode subir, descer, ir para o primeiro ou para o ultimo lugar, e o app pergunta se o plano deve ser atualizado com a nova ordem.
- **Prazo do plano**: data de vencimento opcional, definida ao criar o plano (manual ou automático) ou depois, em qualquer plano ("Definir prazo" no seletor de planos e na linha "Prazo" do plano ativo). Aviso por notificação 2 dias antes (às 09:00). O chip "N vencidos" abre o seletor já com a seção "Vencidos" expandida; planos vencidos podem ser reativados com +30/+60/+90 dias, data própria ou sem prazo.
- **Treino em execução**: séries marcadas uma a uma, cronômetro de descanso (não dispara em exercícios marcados como "Sem descanso"), duração e volume ao vivo. Carga e repetições vêm preenchidas do último treino do exercício. Dá para remover a última série pendente ("REMOVER"), e ao concluir uma série com peso maior que o do último treino aparece um aviso rápido de parabéns (uma vez por exercício, com vibração curta). Se o app for fechado no meio do treino, ele é retomado ao reabrir, com os pesos e as séries como estavam (fica só no aparelho).
- **Editar treino durante a execução** (opcional, em Configurações): substituir ou adicionar exercícios enquanto treina. Ao finalizar, o app pergunta se o plano de origem deve ser atualizado.
- **Histórico e progresso**: treinos salvos e estatísticas calculadas a partir deles.
- **Biblioteca de exercícios**: 873 exercícios em português, com busca (ignora acentos) e filtro por grupo muscular. As imagens carregam da internet na primeira visualização. Ao substituir um exercício, o topo do seletor sugere 3 parecidos (mesmo grupo, priorizando mesmo músculo e equipamento), por regras locais e sem internet.
- **Exercícios personalizados**: quando a base não tem o exercício, é possível criar o seu (nome, grupo muscular, equipamento, instruções e link de vídeo opcional), editar e excluir. Eles aparecem na biblioteca com o selo "MEU", entram nos planos e treinos como os demais e vão para o backup. O botão "Abrir vídeo" abre o link no navegador ou no app do vídeo.
- **Contas e backup**: login com e-mail e senha (as contas são criadas pelo responsável no console do Firebase; não há cadastro no app). Cada conta tem os próprios planos, treinos e exercícios personalizados. O app grava sempre no aparelho, funciona sem internet e envia o backup para o Firestore quando há Wi-Fi. Em um aparelho novo, entrar na conta restaura os dados.
- **Configurações**: tema (escuro, claro ou sistema), conta e backup (estado, "Fazer backup agora", sair), aviso de vencimento do plano, edição do treino durante a execução e acompanhamento motivacional (avisos de parabéns, ligado por padrão).

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
    exercises/          biblioteca e exercícios personalizados
    sessions/           treino em execução, histórico e progresso
    settings/           configurações e avisos
  shared/               tema, Firebase e componentes reutilizáveis
docs/                   roadmap e guia do Firebase
scripts/                teste de conexão com o Firebase
```

Os dados ficam no aparelho (AsyncStorage), separados por conta. O Firebase (Auth e Firestore) guarda apenas o backup; as regras de segurança permitem que cada pessoa acesse somente `users/{seu UID}`.

## Créditos

Exercícios: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense), com tradução CC0 de `gugeldev/exercicios-bd-ptbr`.
