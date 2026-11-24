# PBI-20: Orquestrador e agente do cliente

Pull request: `pbi/20-orchestrator` → `staging`. **Depende dos PRs #430 a #436** (a branch sai da do PBI-19).

## O que foi entregue

- **Laço do agente** (`agents/agent-loop.ts`): a cada passo o modelo chama uma ferramenta ou dá a resposta final (JSON validado pelo `LlmService`). As ferramentas passam pelo executor (papel, política, idempotência, aprovação, auditoria), então o laço não faz nada que a pessoa não pudesse fazer. Limites de **passos** (`AGENT_MAX_STEPS`, 6) e de **custo** (`AGENT_MAX_COST_MICRO_USD`, 50 000, ou seja US$ 0,05). O laço **para** quando uma ferramenta espera aprovação e diz à pessoa para aprovar (`approval_required` com o `approvalId`). Resultado de ferramenta entra como dado, entre `<tool_result>`, sem a tag de fechamento forjada e cortado em 4000 caracteres.
- **Agente do cliente** (`agents/customer/customer-agent.ts`): catálogo, carrinho e pedidos, com as seis ferramentas do cliente. Nome `customer_agent`, prompt `customer-agent-v1`.
- **Orquestrador** (`agents/orchestrator.ts`): o roteador (PBI-19) decide; esclarecer, recusar e escalar para um humano respondem sem agente; as rotas de compra vão ao agente do cliente; `seller_tools` responde com honestidade que o assistente da loja ainda não existe.
- **Stream para o chat:** `POST /chat/stream` (cliente e vendedor) responde com eventos (`status`, `tool_call`, `tool_result`, `approval_required`, `message`, `done`); o BFF repassa o fluxo. Os eventos não levam a entrada das ferramentas (pode ter endereço).
- **Nome do agente em todo passo auditado:** nova coluna `audit_log.agent` (migração `20261124170000`); o executor grava agente, modelo e versão do prompt de cada chamada de ferramenta, e o roteador grava `router`.

## Critérios de aceite

| Critério | Prova |
|---|---|
| Laço com limites de passos e de custo | `agent-loop.spec.ts` ("step limit", "cost limit") |
| Agente de suporte do cliente (catálogo, carrinho, pedidos) | `agent-loop.spec.ts`, `orchestrator.spec.ts` (rotas, ferramentas do agente) |
| Resposta em stream para o chat | `orchestrator.spec.ts` (`ChatController`) e `chat.controller.spec.ts` do BFF (fluxo repassado) |
| Nome do agente em cada passo auditado | `agent-loop.spec.ts` (contexto com agente, modelo e prompt) e `audit.service.spec.ts` (coluna) |

## Limites

- **Nunca rodou com um modelo de verdade.** Só o falso roteirizado foi usado; a qualidade das respostas, o seguimento do formato e o custo real não foram medidos (PBI-38).
- O texto da resposta chega inteiro num evento `message`: o provedor é chamado sem streaming de tokens. A página de chat é o PBI-10.
- O histórico vem do navegador (até 10 falas); a memória no servidor é o PBI-21. O agente não lembra de uma conversa a outra.
- Uma tentativa de repetir a mesma mensagem refaz as ações: cada execução do laço tem as suas chaves de idempotência.
- A aprovação ainda é feita por outra chamada (`/approvals`); o chat só avisa e mostra o `approvalId`.
