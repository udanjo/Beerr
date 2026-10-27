---
name: ux-review
description: Antes de implementar qualquer solicitação de tela, fluxo, componente ou ajuste visual no BeeRR, aciona um agente de UX separado (ux-designer) para avaliar o pedido e orientar a melhor forma de fazer. Use em toda solicitação que altere o que o usuário vê ou toca.
---

# Revisão de UX por agente separado

A cada solicitação que mude interface ou comportamento visível (telas, formulários, listas, painéis, navegação, textos, cores, espaçamentos, fluxos), a UX é avaliada por um agente independente **antes** de escrever código.

## Quando usar
- Novas telas, funcionalidades ou campos.
- Mudanças de layout, navegação, textos ou fluxo.
- Correções de "está feio/quebrado/confuso".

## Quando pular
- Mudanças sem efeito visual (refatoração, tipos, dependências, scripts, dados).
- Correção pontual e óbvia de bug de lógica.
Nesses casos, diga em uma linha que pulou a revisão e por quê.

## Passos
1. **Resuma o pedido** do usuário em 2–4 linhas, com as restrições que ele deu. Se houver imagens/prints, descreva o que mostram.
2. **Chame o agente `ux-designer`** (ferramenta Agent, `subagent_type: "ux-designer"`) com:
   - o pedido resumido;
   - os arquivos que provavelmente serão tocados (o agente lê o código por conta própria);
   - a pergunta: "Como fazer isso com a melhor UX neste app?".
   Não passe a solução que você já pensou: o objetivo é uma segunda opinião independente.
3. **Leia o parecer** e decida:
   - Aplique as recomendações que cabem no pedido.
   - Se alguma contradisser o que o usuário pediu explicitamente, **siga o usuário** e mencione a divergência.
   - Se o agente trouxer "Perguntas ao usuário", pergunte antes de implementar.
4. **Implemente** seguindo `react-native-frontend` e as regras de `AGENTS.md`.
5. **No resumo final**, inclua uma linha "UX:" com o veredito do agente e quais recomendações foram aplicadas ou deixadas de fora (e por quê).

## Regras
- O agente é somente leitura: ele orienta, quem edita código é você.
- Uma chamada por solicitação; não repita a cada pequeno ajuste da mesma conversa, só se o escopo mudar.
- Não trate o parecer como lei: ele é um conselho para escolher a melhor forma, não uma barreira.
