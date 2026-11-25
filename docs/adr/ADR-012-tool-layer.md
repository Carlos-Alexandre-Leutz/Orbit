# ADR-012: Toda ação de um agente é uma ferramenta validada

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

Um agente de IA decide o que fazer, mas não pode ter acesso direto ao banco nem aos serviços da loja. Precisamos de um ponto único que confira quem pode chamar o quê, valide a entrada, evite repetir uma compra e deixe tudo registrado, e que valha para qualquer agente que vier (cliente, vendedor, análise).

## Decision

Um agente só age por **ferramentas** (`apps/api-tasks/src/tools`). Uma ferramenta é um objeto com nome, descrição e JSON Schema para o modelo, papéis permitidos, se muda dados (`sideEffect`), se exige aprovação humana (`requiresApproval`), um `parse` que valida a entrada (campos desconhecidos são recusados) e um `run` que chama os mesmos serviços das páginas, então as regras da loja (estoque, limites, quem vê um pedido) valem sem cópia.

O `ToolExecutor` roda, nesta ordem: a ferramenta existe, o papel pode chamá-la, a entrada é válida, uma ferramenta que muda dados tem **chave de idempotência**, e uma que exige aprovação passa pelo `ApprovalGate`. A tabela `ToolRun` guarda, por (ator, ferramenta, chave), se a execução começou, terminou ou falhou: a mesma chave não roda duas vezes, devolve a resposta guardada, e uma execução que falhou pode ser repetida. **Toda** decisão vai para o log de auditoria ([ADR-010](ADR-010-append-only-audit-log.md)), inclusive recusas (papel, entrada inválida, ferramenta desconhecida, aprovação pendente ou rejeitada). Cada ferramenta escolhe o que vai para o log (`auditInput`, `auditOutput`), então endereço e texto livre ficam de fora.

O executor nunca lança erro esperado: devolve `{ ok: false, error: { code, message } }` para o agente ler. Uma recusa da loja (sem estoque, carrinho vazio) mantém a mensagem; um erro interno vira "The tool failed".

Ferramentas do cliente, hoje: `catalog.search`, `cart.view`, `cart.add_item`, `orders.place` (compra, com aprovação), `orders.status` e `orders.cancel` (com aprovação). Elas agem como o usuário autenticado e nunca com direitos de lojista.

**O `ApprovalGate` padrão segura toda chamada que exige aprovação** (`HoldingApprovalGate`): até o PBI-13 trazer o fluxo de aprovação, `orders.place` e `orders.cancel` não executam.

## Alternatives considered

- **Deixar o agente chamar os serviços direto:** sem papel, auditoria nem idempotência centralizados.
- **Idempotência só pela chave do pedido:** cobre a compra, mas não as outras ferramentas que mudam dados.
- **Exceções em vez de resultado:** o laço do agente teria de capturar cada tipo; um resultado tipado é mais simples de mostrar ao modelo.

## Consequences

- Um agente novo só precisa de uma lista de ferramentas e de um contexto (ator e chave).
- O texto devolvido pelas ferramentas vem de lojistas (nomes de produtos). **É dado, nunca instrução**; as descrições dos produtos ficam de fora da busca de propósito.
- Se a gravação da auditoria falhar depois que uma ferramenta já mudou dados, o erro é registrado no log do servidor e a resposta segue: a mudança não pode ser desfeita.
- Um chamador que esquece de repetir a mesma chave numa nova tentativa pode executar a ação duas vezes; a chave é responsabilidade do laço do agente (PBI-20).
