# Roadmap

Decisões: cada pessoa usa o próprio celular (login uma vez com e-mail e senha, sem troca de perfil); o app grava sempre no aparelho e o Firebase é só backup, enviado quando houver Wi-Fi; dados atuais são de teste e serão apagados (sem migração); tema por aparelho, aviso de vencimento por pessoa; Firebase JS SDK, para continuar no Expo Go.

## v1.3.0 — base

- [x] Firebase JS SDK instalado, `src/shared/firebase/firebase.ts` (inicialização com persistência do login em AsyncStorage; inativo enquanto não houver configuração) e `.env.example`. Bundle do Android validado com `expo export`.
- [ ] Testar atualização do APK por cima de uma versão anterior (dados preservados). Se não preservar, fixar a assinatura com um keystore nos secrets do GitHub.
- [ ] Criar o projeto no Firebase, as 2 contas (e-mail/senha) e as Security Rules (`users/{uid}/**` só para o próprio uid); preencher `.env.local`.
- [ ] Validar Auth e Firestore no Expo Go e no APK do CI (cache offline do Firestore no React Native é incerto).

## v1.4.0 — conta e backup

- Tela de login (sessão persistente, sair em Configurações; consultar o `ux-designer`). Sem criar conta pelo app.
- Dados locais guardados por conta.
- Backup em segundo plano só no Wi-Fi: marcar o que mudou, enviar e tentar de novo se falhar. Um documento por treino.
- Restaurar ao entrar num aparelho vazio.
- Configurações: "Último backup / Pendente" e botão "Fazer backup agora".

## v1.5.0 — biometria

- Trava opcional ao abrir o app (`expo-local-authentication`), com interruptor em Configurações e carência de 5 minutos ao voltar do segundo plano.

## Ideias para mais para frente

- Aviso quando o último backup estiver muito velho.
- Avisar ao sair da conta que dados ainda não enviados ficam no aparelho.
- Interruptor "permitir backup com dados móveis".
- Exportar/importar arquivo JSON de backup (segunda proteção, sem depender da nuvem).
- Remover exercício durante o treino e dica no card quando a edição do treino está desligada.
