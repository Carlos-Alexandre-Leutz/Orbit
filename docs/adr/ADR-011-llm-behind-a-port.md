# ADR-011: O modelo de linguagem fica atrás de uma porta

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

Os agentes do Orbit (PBI-19 a PBI-21) vão chamar um modelo de linguagem. Um modelo falha, demora, custa por token e às vezes responde fora do formato pedido. O projeto não tem chave de API ainda, e os testes não podem depender da internet nem gastar dinheiro.

## Decision

Tudo passa pelo `LlmService` (`apps/api-tasks/src/llm`), que fala com a porta `LlmProvider`:

- **Adaptadores:** `GeminiLlmProvider` (REST `generateContent`, **nunca rodou contra a API real**), `FakeLlmProvider` (roteirizado, para testes e desenvolvimento) e `UnavailableLlmProvider` (produção sem chave: toda chamada falha em vez de inventar resposta). A fábrica escolhe pela `GEMINI_API_KEY`, no mesmo padrão do pagamento ([ADR-004](ADR-004-payments-behind-a-port.md)).
- **Robustez:** tempo limite por tentativa, novas tentativas com espera dobrando (só para erro que esperar resolve: limite de uso, 5xx, rede), e queda para o próximo modelo da lista `LLM_MODELS`.
- **Saída estruturada:** `completeStructured` pede JSON, valida com uma função do chamador e, se o formato estiver errado, devolve o erro ao modelo e pede de novo (`maxRepairs`, 1 por padrão); depois disso rejeita com `LlmInvalidOutputError`.
- **Registro:** cada chamada (inclusive tentativa que falhou e resposta vinda do cache) grava uma linha em `LlmCall` com modelo, tokens, custo em milionésimos de dólar, latência e o ID de correlação; também vira um passo do trace ([PBI-12](../pbi/PBI-12.md)). **O prompt e a resposta nunca são gravados**, só o tamanho.
- **Cache:** em memória, por hash do pedido, só quando o chamador pede (`cache: true`).

## Alternatives considered

- **Usar o SDK do Gemini direto nos agentes:** espalha timeout, retry e custo por todo agente e prende o código a um fornecedor.
- **Biblioteca de schema (Zod) para a validação:** não está no projeto; a função `validate` do chamador serve e pode usar uma depois.
- **Cache no Redis:** o Redis foi cortado do projeto; a porta `LlmCache` deixa trocar depois.

## Consequences

- Testar um agente não precisa de rede nem de chave.
- A tabela de preços (`llm-pricing.ts`) é aproximada e envelhece; `LLM_PRICES_JSON` a sobrescreve. Um modelo sem preço custa 0 no registro.
- O adaptador do Gemini pode precisar de ajustes na primeira chamada real, que depende de uma chave sua.
- O cache em memória some a cada reinício e não é compartilhado entre instâncias.
