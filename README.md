# BeeRR

App de treino de academia em português (pt-BR), com tema escuro em verde neon (e opção de tema claro), inspirado no BeFit. Feito com Expo SDK 58, React Native 0.88, React 19 e TypeScript.

## Funcionalidades

- **Planos de treino**: vários planos, cada um com treinos (A, B, ...) livres, grupos musculares e exercícios com séries, repetições, carga, descanso e observações.
- **Prazo do plano**: data de vencimento opcional, aviso por notificação 2 dias antes (às 09:00) e seção "Vencidos" no seletor de planos. Planos vencidos podem ser reativados com +30/+60/+90 dias, data própria ou sem prazo.
- **Treino em execução**: séries marcadas uma a uma, cronômetro de descanso, duração e volume ao vivo. Carga e repetições vêm preenchidas do último treino do exercício.
- **Editar treino durante a execução** (opcional, em Configurações): substituir ou adicionar exercícios enquanto treina. Ao finalizar, o app pergunta se o plano de origem deve ser atualizado.
- **Histórico e progresso**: treinos salvos e estatísticas calculadas a partir deles.
- **Biblioteca de exercícios**: 873 exercícios em português, com busca (ignora acentos) e filtro por grupo muscular. As imagens carregam da internet na primeira visualização.
- **Configurações**: tema (escuro, claro ou sistema), aviso de vencimento do plano e edição do treino durante a execução.

## Como rodar

```bash
npm install
npx expo start      # escaneie o QR code com o Expo Go no celular
```

Verificações:

```bash
npx tsc --noEmit                    # checagem de tipos
npx expo export --platform android  # confere se o bundle compila
```

## Gerar o APK

O workflow `.github/workflows/build-apk.yml` compila o APK de release (arm64) no GitHub Actions. Ele roda ao enviar uma tag `v*` (por exemplo, `v1.2.0`) ou manualmente em *Actions → Build APK → Run workflow*. O APK fica disponível como artefato `beerr-apk`.

Ao publicar uma versão, atualize `version` em `app.json` e `package.json` e incremente `android.versionCode`.

## Estrutura

```
src/
  app/AppShell.tsx      navegação por estado (abas e treino em execução)
  features/
    plans/              planos, treinos, exercícios e prazos
    exercises/          biblioteca de exercícios
    sessions/           treino em execução, histórico e progresso
    settings/           configurações e avisos
  shared/               tema e componentes reutilizáveis
```

Os dados ficam no aparelho (AsyncStorage); não há conta nem servidor.

## Créditos

Exercícios: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense), com tradução CC0 de `gugeldev/exercicios-bd-ptbr`.
