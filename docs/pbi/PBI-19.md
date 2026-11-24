# PBI-19: Roteador de intenção

Pull request: `pbi/19-intent-router` → `staging`. **Depende dos PRs #430 a #435** (a branch sai da do PBI-14).

## O que foi entregue

- **`IntentRouter`** (`apps/api-tasks/src/agents/router`): um modelo pequeno classifica a mensagem em uma rota, com saída estruturada validada (pelo `LlmService` do [ADR-011](../adr/ADR-011-llm-behind-a-port.md): uma resposta fora do formato volta ao modelo uma vez).
- **Limiar de confiança:** a partir de 0,7 a mensagem segue para a rota; entre 0,4 e 0,7 o roteador devolve uma pergunta (a que o modelo escreveu ou uma padrão); abaixo de 0,4, ou se a pessoa pede um humano, ou se o modelo falha, a conversa vai para um humano (`escalate`). Variáveis opcionais: `ROUTER_MIN_CONFIDENCE`, `ROUTER_CLARIFY_CONFIDENCE`, `ROUTER_MODELS`.
- **Rotas por papel** (`routes.ts`): o modelo só vê as rotas que o papel pode usar (cliente: catálogo, carrinho, pedidos, geral, humano; vendedor também `seller_tools`; admin só geral e humano), e uma rota fora da lista, mesmo nomeada pelo modelo, vira `refuse`.
- **Auditoria de toda decisão** (`router.classify`): ator, papel, ação, rota, confiança, modelo e versão do prompt (`router-v1`); **nunca a mensagem**. Recusa sai como `DENIED`, falha do modelo como `FAILURE`.
- **A mensagem é dado:** vai entre tags `<message>`, sem a tag de fechamento forjada, cortada em 2000 caracteres, e o prompt manda não seguir instruções dentro dela. Só as 4 últimas falas do histórico entram.

## Critérios de aceite

| Critério | Prova |
|---|---|
| Classificador com modelo pequeno e saída estruturada | `intent-router.spec.ts` (resposta válida, inválida reparada, inválida rejeitada) |
| Limiar que pede esclarecimento ou escala para humano | `intent-router.spec.ts` (clarify, default, escalate, pedido de humano, falha do modelo) |
| Rotas restritas por papel | `intent-router.spec.ts` (rotas oferecidas por papel, recusa de rota proibida) |
| Auditar toda decisão | `intent-router.spec.ts` (auditoria sem a mensagem, com modelo e versão) |

## Limites

- Nenhum teste usa um modelo de verdade: só o falso roteirizado. A **qualidade** da classificação (acertos reais, limiares certos) não foi medida; isso é o conjunto de avaliação do PBI-38.
- As rotas `catalog`, `cart`, `orders` e `seller_tools` ainda não têm agente atrás; o orquestrador (PBI-20) as liga. O prompt ainda é uma constante no código (versionado no PBI-22).
- A tabela `LlmCall` guarda o custo da classificação, mas nenhum limite de custo por usuário existe.
