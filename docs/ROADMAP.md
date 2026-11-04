# Roadmap

Decisões: cada pessoa usa o próprio celular (login uma vez com e-mail e senha, sem troca de perfil); o app grava sempre no aparelho e o Firebase é só backup, enviado quando houver Wi-Fi; dados atuais são de teste e serão apagados (sem migração); tema por aparelho, aviso de vencimento por pessoa; Firebase JS SDK, para continuar no Expo Go.

Pensar em N usuários, não em 2: nada de e-mail ou UID fixo no código; os dados ficam em `users/{uid}/...` e as regras valem para qualquer conta. Para incluir uma pessoa nova basta criar a conta no Authentication (sem mexer no app). Cada usuário também terá um documento `users/{uid}/profile` (nome de exibição, data de criação).

## v1.3.0 — base

- [x] Firebase JS SDK instalado, `src/shared/firebase/firebase.ts` (inicialização com persistência do login em AsyncStorage; inativo enquanto não houver configuração) e `.env.example`. Bundle do Android validado com `expo export`.
- [ ] Testar atualização do APK por cima de uma versão anterior (dados preservados). Se não preservar, fixar a assinatura com um keystore nos secrets do GitHub.
- [ ] Criar o projeto no Firebase, as 2 contas (e-mail/senha) e as Security Rules (`users/{uid}/**` só para o próprio uid); preencher `.env.local`.
- [ ] Validar Auth e Firestore no Expo Go e no APK do CI (cache offline do Firestore no React Native é incerto).

## v1.4.0 — conta e backup (implementado; falta testar no aparelho)

- Tela de login (sessão persistente, sair em Configurações; consultar o `ux-designer`). Sem criar conta pelo app.
- Dados locais guardados por conta.
- Backup em segundo plano só no Wi-Fi: marcar o que mudou, enviar e tentar de novo se falhar. Um documento por treino.
- Restaurar ao entrar num aparelho vazio.
- Configurações: "Último backup / Pendente" e botão "Fazer backup agora".

## v1.5.0 — biometria (implementado; falta testar no aparelho)

- Trava opcional ao abrir o app (`expo-local-authentication`), com interruptor em Configurações e carência de 5 minutos ao voltar do segundo plano.

## Próxima — criar plano automático (MVP sem IA)

Botão "Criar plano" que faz um questionário de múltipla escolha e monta um plano já no formato do app, escolhendo exercícios da biblioteca por regras locais (sem IA, sem custo, funciona offline). Serve só para montar treinos. Plano gerado é revisado antes de salvar. Pesos sempre 0 (o app preenche pela última sessão). Aviso de que não substitui profissional.

Questionário (9 perguntas): objetivo, nível, dias por semana, tempo por treino, equipamento, foco muscular (até 2), divisão preferida, limitações, cardio.

Tarefas do MVP, nesta ordem:
- [x] T1. Contrato do plano gerado (`GeneratedPlanSpec`: dias, grupos, ids da biblioteca, séries, descanso, notas) e regras de validação (máx. 7 dias, 3 a 8 exercícios por dia, séries 1-6, reps 1-30, descanso dentro de `REST_OPTIONS`, sem repetir exercício no dia, peso 0).
- [x] T2. `buildPlanFromSpec`: valida o spec contra a biblioteca e monta o `Plan` com `createId` e `createExerciseFromLibrary`.
- [x] T3. `addGeneratedPlan` em `usePlans`: grava um plano completo, seleciona-o e marca o backup.
- [x] T4. Auditar `equipment` e `level` da biblioteca e mapear as respostas do questionário.
- [x] T5. Lista curada de exercícios principais por grupo e equipamento, e lista de exercícios a evitar por limitação.
- [x] T6. Gerador local `generatePlanLocal(respostas)`: divisões (corpo inteiro, AB, ABC, PPL, ABCD), exercícios por tempo, séries/reps/descanso por objetivo, cardio opcional.
- [x] T7. Consultar o `ux-designer` (questionário, revisão, erro, estado vazio).
- [x] T8. Telas: aviso de saúde, 9 perguntas, resumo, revisão (salvar, editar, descartar) e botão na tela de plano.

## Depois do MVP — plano com IA (validar só depois de implementar e testar o MVP)

Chamar a API da Anthropic por uma Cloud Function do Firebase (a conta/assinatura Claude e o MCP não servem para isso; a chave nunca vai no app). O gerador local vira reserva quando não houver internet, a cota acabar ou a resposta vier inválida. A IA devolve só ids da biblioteca; o app valida e monta o plano com o mesmo `buildPlanFromSpec`.

Decisões em aberto: aceitar o plano Blaze (cartão) do Firebase com orçamento e alerta baixos; modelo e teto mensal; limites sugeridos de 5 gerações por dia e 20 por mês por conta (falhas não contam); o app envia a lista candidata de exercícios, sem duplicar `exercises.json` no servidor; enviar só as respostas do questionário (sem nome, e-mail ou histórico).

- [ ] T0. Fechar a base do Firebase (projeto, contas, regras; login e backup testados no aparelho). Obrigatória antes da IA.
- [ ] T9. Projeto de Cloud Functions com callable protegida por Auth e lista de uids permitidos.
- [ ] T10. Chave no Secret Manager e chamada à API da Anthropic (timeout, limite de tamanho).
- [ ] T11. Prompt com JSON estrito e lista candidata filtrada por equipamento, nível e grupos.
- [ ] T12. Limite de uso (contador no Firestore escrito só pela função) e alerta de orçamento no Google Cloud.
- [ ] T13. Cliente: chamada da função, cancelamento e reserva no gerador local.
- [ ] T14. Textos de privacidade e "gerações restantes" na tela; atualizar README e este roadmap.

## Ideias para mais para frente

- Cadastro pelo próprio app com código de convite (hoje as contas são criadas por você no console; só vale a pena se o número de pessoas crescer).
- Aviso quando o último backup estiver muito velho.
- Avisar ao sair da conta que dados ainda não enviados ficam no aparelho.
- Interruptor "permitir backup com dados móveis".
- Exportar/importar arquivo JSON de backup (segunda proteção, sem depender da nuvem).
- Remover exercício durante o treino e dica no card quando a edição do treino está desligada.
