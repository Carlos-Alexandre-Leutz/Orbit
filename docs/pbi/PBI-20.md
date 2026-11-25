# PBI-20: Orquestrador e agente da loja

Pull request: `pbi/20-orchestrator` → `staging`. **Revisado em 2026-11-25** (branch `feat/store-chat`): o agente do cliente e o orquestrador deram lugar ao agente da loja. **Depende dos PRs #430 a #436** (a branch sai da do PBI-19).

## O que foi entregue

- **Laço do agente** (`agents/agent-loop.ts`): a cada passo o modelo chama uma ferramenta ou dá a resposta final (JSON validado pelo `LlmService`). As ferramentas passam pelo executor (papel, política, idempotência, aprovação, auditoria), então o laço não faz nada que a pessoa não pudesse fazer. Limites de **passos** (`AGENT_MAX_STEPS`, 6) e de **custo** (`AGENT_MAX_COST_MICRO_USD`, 50 000, ou seja US$ 0,05). O laço **para** quando uma ferramenta espera aprovação e diz à pessoa para aprovar (`approval_required` com o `approvalId`). Resultado de ferramenta entra como dado, entre `<tool_result>`, sem a tag de fechamento forjada e cortado em 4000 caracteres.
- **Agente da loja** (`agents/store/store-agent.ts`, 2026-11-25): responde só sobre a loja do link, com as ferramentas de leitura `store.info`, `store.search_products` e `store.delivery_estimate` (`tools/store-tools.ts`). Nome `store_agent`, prompt `store-agent-v1`. A loja vem do contexto da chamada (o link da página), nunca do modelo: uma entrada com `store` é recusada. Ele substituiu o agente do cliente (catálogo, carrinho e pedidos) e o orquestrador, que foram removidos.
- **Chat público da loja:** `POST /stores/:slug/chat` (sem login; o BFF repassa). Só roda para loja publicada e não suspensa. O visitante age como `CUSTOMER` com id `visitor:<uuid>`; a política v2 só lista as ferramentas `store.*`. Limites em memória: `STORE_CHAT_PER_VISITOR_HOUR` (30) e `STORE_CHAT_PER_STORE_HOUR` (300), além dos limites por hora da política, contados no log de auditoria.
- **Nome do agente em todo passo auditado:** coluna `audit_log.agent` (migração `20261124170000`); o executor grava agente, modelo e versão do prompt de cada chamada de ferramenta.

## Critérios de aceite

| Critério | Prova |
|---|---|
| Laço com limites de passos e de custo | `agent-loop.spec.ts` ("step limit", "cost limit") |
| Agente da loja (só leitura, preso à loja do link) | `store-tools.spec.ts`, `store-chat.service.spec.ts`, `rate-limit.spec.ts` |
| Resposta ao chat | `store-chat.service.spec.ts` (e `lib/store-chat.test.ts` no web). O stream de eventos foi removido: a resposta é um JSON |
| Nome do agente em cada passo auditado | `agent-loop.spec.ts` (contexto com agente, modelo e prompt) e `audit.service.spec.ts` (coluna) |

## Limites

- **Nunca rodou com um modelo de verdade.** Só o falso roteirizado foi usado; o Gemini precisa de `GEMINI_API_KEY` no QA; a qualidade das respostas, o seguimento do formato e o custo real não foram medidos (PBI-38).
- O histórico vem do navegador (até 10 falas) e nada fica no servidor; o agente não lembra de uma visita a outra.
- O limite por visitante usa um id que o navegador inventa, então não impede quem troca de id; o teto por loja segura o custo. O IP do visitante não chega à API.
- As ferramentas de carrinho e pedido (`customer-tools.ts`) e a política v1 continuam no código, mas a política v2 não deixa nenhum papel usá-las. O roteador de intenção (PBI-19) ficou sem chamador até o agente do lojista (PBI-32).
- A aprovação humana (`/approvals`) continua existindo na camada de ferramentas, sem uso no chat da loja.
