# PBI-13: Aprovação humana

Pull request: `pbi/13-human-approval` → `staging`. **Depende dos PRs #430, #431, #432 e #433.** Decisão em [ADR-013](../adr/ADR-013-human-approval.md).

## O que foi entregue

- **Tabela `Approval`** (migração `20261124160000`): pedido, resumo, valor, estado (`PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`, `EXECUTED`), quem decidiu e quando, validade.
- **Fluxo propor → decidir → executar:** `DatabaseApprovalGate` no lugar do gate que retinha tudo; `POST /approvals/:id/approve` aprova e roda a chamada pelo executor; `POST /approvals/:id/reject`; `GET /approvals` e `/approvals/:id`. O BFF repassa as quatro rotas.
- **Confirmação extra acima do limite:** `APPROVAL_HIGH_VALUE_CENTS` (50 000); é preciso mandar `confirmAmountCents` igual ao valor.
- **Resumos** das duas ferramentas com aprovação: comprar (itens e total do carrinho) e cancelar (pedido e total).
- Variáveis novas (opcionais): `APPROVAL_HIGH_VALUE_CENTS`, `APPROVAL_TTL_HOURS`.

## Critérios de aceite

| Critério | Prova |
|---|---|
| Tabela de aprovações | migração + `migrate diff` sem diferenças |
| Propor, confirmar ou rejeitar, executar | `approvals.service.spec.ts` (todos os caminhos) e `tool-executor.spec.ts` (resumo, `complete`) |
| Confirmação extra acima do limite | `approvals.service.spec.ts` ("type the amount back") |

## Limites

- Sem tela: a aprovação só existe na API e no BFF (a interface é o PBI-10).
- O limite é global e em centavos, sem moeda; a política por ferramenta é o PBI-14.
- A aprovação foi testada com o Prisma simulado; não há teste de integração em PostgreSQL nem de aprovação simultânea.
- Ninguém avisa a pessoa de que há algo esperando (e-mail ou notificação).
