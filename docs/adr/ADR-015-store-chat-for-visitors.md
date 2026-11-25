# ADR-015: Chat público por loja, só de leitura

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

O primeiro chat do Orbit (PBI-10 e PBI-20) era uma página `/assistant` para quem estava logado, com agente que montava carrinho e fazia pedidos com aprovação. O dono decidiu outra coisa: cada loja tem o seu assistente, para o visitante da loja tirar dúvidas (tem o produto, quanto custa, quantos dias leva o frete, há promoção), sem comprar pelo chat e sem um chat do Orbit.

## Decision

- Um botão no canto inferior direito de toda página da loja abre o chat. Ele chama `POST /stores/:slug/chat`, **público**, como a vitrine.
- O agente `store_agent` usa só ferramentas de leitura (`store.info`, `store.search_products`, `store.delivery_estimate`). A loja vem do **contexto da chamada** (o link), nunca da entrada do modelo, então um chat não lê outra loja. O que o vendedor escreveu (descrições, destaques) é dado, nunca instrução.
- O visitante não tem conta: age com o papel `CUSTOMER` e o id `visitor:<uuid>` (gerado pelo navegador), que só agrupa os limites e a auditoria. A **política v2** lista apenas as ferramentas `store.*` para `CUSTOMER` e nenhuma para os outros papéis, então carrinho e pedido não ficam ao alcance de ninguém pelo agente.
- A conversa fica no navegador; a cada pergunta a página manda as últimas 10 falas.
- Loja em rascunho ou suspensa responde "não encontrada". Limites em memória por visitante e por loja protegem a cota do modelo.
- Promoção: o Orbit não tem cadastro de promoção. O assistente responde só com o que existe (preço, frete grátis acima de um valor, destaques) e diz que não há mais nada.

## Alternatives considered

- **Exigir login:** reaproveitaria a conta e a auditoria por usuário, mas quem só olha a loja não poderia perguntar.
- **Novo papel `VISITOR` no banco:** mais correto, mas exige migração do enum `Role` e mexer em guardas; o papel `CUSTOMER` com a política v2 dá a mesma garantia hoje.
- **Manter o assistente que compra:** o dono não quer; compra continua pelo carrinho.

## Consequences

- O chat exposto à internet gasta cota de modelo: os limites em memória somem no reinício e valem por instância, e o id do visitante é falsificável. O teto por loja é a proteção real; limite por IP exige levar o IP até a API.
- As ferramentas de carrinho e pedido e a política v1 ficam no código sem uso, para um agente que compre voltar um dia.
- O Gemini real nunca rodou neste projeto; em produção sem `GEMINI_API_KEY` o chat responde que não está disponível.
