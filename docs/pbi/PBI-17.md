# PBI-17: Interface LLM

Pull request: `pbi/17-llm-interface` → `staging`. **Depende dos PRs #430 e #431** (a branch sai da do PBI-12). Decisão em [ADR-011](../adr/ADR-011-llm-behind-a-port.md).

## O que foi entregue

- **Porta `LlmProvider`** com três adaptadores: Gemini (REST, **nunca rodou: não há chave**), um falso roteirizado e um "indisponível" para produção sem chave. Escolha pela `GEMINI_API_KEY`.
- **`LlmService.complete`:** tempo limite por tentativa, novas tentativas com espera dobrando (só quando esperar ajuda), queda para o próximo modelo de `LLM_MODELS`.
- **`completeStructured`:** JSON validado por uma função do chamador; resposta inválida volta ao modelo com o motivo e é pedida de novo; depois do limite, `LlmInvalidOutputError`.
- **Registro por chamada** na tabela `LlmCall` (migração `20261124140000`): modelo, tokens, custo, latência, ID de correlação, cache e erro; também um passo `llm.call` no trace. Nunca grava o prompt nem a resposta.
- **Cache** em memória por hash do pedido, só quando pedido (`cache: true`).
- Variáveis novas (todas opcionais): `GEMINI_API_KEY`, `LLM_MODELS`, `LLM_TIMEOUT_MS`, `LLM_PRICES_JSON`.

## Critérios de aceite

| Critério | Prova |
|---|---|
| Porta e adaptador Gemini | `gemini-llm.provider.spec.ts` (formato do pedido e da resposta, com `fetch` simulado) |
| Timeout, retry e fallback | `llm.service.spec.ts` |
| Saída estruturada rejeitada ou repetida | `llm.service.spec.ts` (`completeStructured`) |
| Tokens, custo e latência por chamada | `llm.service.spec.ts` (linha gravada) |
| Cache de respostas repetidas | `llm.service.spec.ts` e `llm-support.spec.ts` |

## Limites

- O adaptador do Gemini nunca falou com a API real; o primeiro uso pode pedir ajustes (campos do `responseSchema`, nomes de modelo).
- Os preços são aproximados e ficam velhos; um modelo sem preço custa 0 no registro.
- O prompt versionado e a versão do prompt na chamada são do PBI-22.
- Nenhum agente usa o serviço ainda (PBI-18 a PBI-20).
