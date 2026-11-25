# ADR-013: Aprovação humana de ferramentas com efeito colateral

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

O [ADR-012](ADR-012-tool-layer.md) criou a camada de ferramentas e a regra "ferramenta com efeito colateral precisa de aprovação humana", mas deixou a aprovação atrás de uma porta (`ApprovalGate`) que apenas retém a chamada. Faltava o fluxo de verdade: o agente propõe, uma pessoa decide, e só então a chamada roda.

## Decision

- **Propor:** quando uma ferramenta com `requiresApproval` é chamada, o executor monta um resumo (`approvalSummary`: uma frase e o valor em jogo) e pergunta ao `DatabaseApprovalGate`, que cria (ou reencontra, pela chave de idempotência) uma linha `Approval` em `PENDING` com a entrada guardada. O agente recebe `APPROVAL_REQUIRED` com o `approvalId`.
- **Decidir:** `POST /approvals/:id/approve` e `/reject` (e `GET /approvals`, `GET /approvals/:id`, também pelo BFF). Só decide a pessoa em nome de quem a chamada age, ou um `ADMIN`; para qualquer outro a aprovação não existe (404). Cada decisão entra no log de auditoria ([ADR-010](ADR-010-append-only-audit-log.md)) com quem decidiu.
- **Executar:** ao aprovar, o endpoint roda o executor com a entrada guardada, como a pessoa de origem e com a mesma chave; o `ToolRun` garante que não roda duas vezes. Se a ferramenta tiver sucesso, a aprovação vai a `EXECUTED`; se falhar, continua `APPROVED` e a chamada pode ser repetida com a mesma chave.
- **Valor alto:** acima de `APPROVAL_HIGH_VALUE_CENTS` (padrão 50 000, ou seja, 500,00 na moeda da loja) quem aprova precisa mandar `confirmAmountCents` com o valor exato; um clique sozinho não basta (erro 409 `AMOUNT_CONFIRMATION_REQUIRED`).
- **Validade:** uma aprovação pendente expira em `APPROVAL_TTL_HOURS` (padrão 24); depois disso a mesma chave é recusada e é preciso uma chave nova.
- A lista e o detalhe mostram só o resumo, nunca a entrada guardada (que pode ter endereço).

## Alternatives considered

- **Executar ao aprovar sem passar pelo executor:** duplicaria papel, validação, auditoria e idempotência.
- **Duas assinaturas para valor alto (segunda pessoa):** a loja tem uma pessoa só por conta; digitar o valor é a confirmação extra possível sem um segundo usuário.
- **Aprovar no próprio chat do agente:** o texto do modelo não é uma decisão humana; a decisão passa por um endpoint autenticado.

## Consequences

- Compras e cancelamentos feitos por agente agora podem rodar, depois de uma decisão registrada.
- O limite é um único valor, sem moeda: uma loja em outra moeda usa o mesmo número em centavos.
- A política por papel e por limite configurável por ferramenta é o PBI-14; hoje o limite é global.
- Não há tela de aprovação ainda (a página de chat é o PBI-10): hoje só a API e o BFF.
