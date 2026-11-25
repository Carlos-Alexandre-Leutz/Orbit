# PBI-18: Camada de ferramentas

Pull request: `pbi/18-tool-layer` → `staging`. **Depende dos PRs #430, #431 e #432.** Decisão em [ADR-012](../adr/ADR-012-tool-layer.md).

## O que foi entregue

- **Contrato `Tool`** (nome, descrição, JSON Schema, papéis, `sideEffect`, `requiresApproval`, `parse`, `run`, visão de auditoria) e `ToolRegistry` (recusa nome repetido e aprovação em ferramenta que não muda dados; lista por papel).
- **`ToolExecutor`:** existe, papel, entrada, chave de idempotência, aprovação (`ApprovalGate`), reexecução protegida pela tabela `ToolRun` (migração `20261124150000`), auditoria de tudo (novo desfecho `PENDING_APPROVAL`).
- **Ferramentas do cliente:** `catalog.search`, `cart.view`, `cart.add_item`, `orders.place` e `orders.cancel` (as duas últimas exigem aprovação), `orders.status`.
- `HoldingApprovalGate` como padrão até o PBI-13.

## Critérios de aceite

| Critério | Prova |
|---|---|
| Contrato com schema, papel, idempotência e efeito colateral | `tool.ts`, `tool-registry.ts`, `tool-executor.spec.ts` (registro) |
| Ferramentas do cliente (buscar, carrinho, comprar, status, cancelar) | `customer-tools.spec.ts` |
| Execução com auditoria e aprovação para efeito colateral | `tool-executor.spec.ts` (auditoria de cada desfecho, aprovação pendente, rejeitada e dada) |
| Testes por ferramenta | `customer-tools.spec.ts` (serviço chamado, entrada inválida, auditoria sem dados pessoais) |

## Limites

- Nenhum agente chama o executor ainda (PBI-20). Sem o PBI-13, `orders.place` e `orders.cancel` ficam retidas.
- Os testes usam o Prisma e os serviços simulados; a unicidade de `ToolRun` no PostgreSQL só foi conferida pela migração e pelo `migrate diff`, não por um teste de concorrência.
- `orders.place` só cria o pedido (a pagar); o pagamento continua sendo feito pelo cliente na página.
- Uma ferramenta de vendedor (produtos, envio) é do PBI-32.
