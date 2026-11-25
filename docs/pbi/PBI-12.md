# PBI-12: ID de correlação e rastreio

Pull request: `pbi/12-correlation-id` → `staging`. **Depende do PR #430** (PBI-11): a branch sai dele e o diff só fica limpo depois que o #430 for mergeado.

## O que foi entregue

- **ID de correlação** na API e no BFF: cada requisição recebe um ID (o do cabeçalho `X-Correlation-Id`, se for um token simples de 8 a 64 caracteres `[A-Za-z0-9._-]`; senão um UUID novo, para ninguém forjar linhas de log). A resposta devolve o ID no mesmo cabeçalho, e o CORS do BFF o expõe.
- **Propagação:** o BFF manda o ID à API em toda chamada (`callStoreApi`). Na API ele vai para o e-mail (cabeçalho no envio HTTP e no SMTP), os pagamentos (metadados do Stripe e do Mercado Pago, cabeçalho no Mercado Pago), a cobrança do lojista e o log de auditoria (nova coluna `audit_log.correlationId`, preenchida sozinha pelo `AuditService`; migração `20261124130000`).
- **LLM e ferramentas:** ainda não existem. `currentCorrelationId()`, `correlationHeaders()` e `recordStep()` (`apps/api-tasks/src/correlation/correlation.ts`) ficam prontos para os PBI-17 e PBI-18 usarem.
- **Traces no MongoDB:** porta `TraceStore`, adaptador `MongoTraceStore` (coleção `execution_traces`, índice TTL de `TRACE_TTL_DAYS`, 30 por padrão, e índice por ID), e um interceptor que grava um trace por requisição (método, rota, status, duração, ator, erro e os passos de `recordStep`). Nunca grava corpo nem valores da query. Falha do Mongo só gera um aviso: a requisição segue. Sem `MONGO_URL`, os traces são descartados.
- **Ambiente:** `MONGO_URL` na API nos dois compose; serviço Mongo no job `typescript` do CI. Nova dependência `mongodb` ^6.10 (o `pnpm-lock.yaml` também subiu o `turbo` de 2.11.11 para 2.11.13, porque ele está como `latest`).

## Critérios de aceite

| Critério | Prova |
|---|---|
| Toda requisição tem um ID e a resposta o devolve | testes de `correlation.spec.ts` (API e BFF); o middleware está ligado em todas as rotas |
| O ID chega a e-mail, pagamentos e auditoria | `audit.service.spec.ts`, `correlationHeaders` e `correlationMetadata`; a chamada real ao Stripe, ao Mercado Pago e ao e-mail **não** foi executada |
| Traces no MongoDB | `test/traces.e2e-spec.ts` contra um Mongo real: grava, acha pelo ID, TTL, e nunca lança com o Mongo fora |

## Limites

- O ID de uma chamada vinda direto do navegador para o web (páginas `/api/session/*`) nasce no BFF; o web ainda não o repassa.
- Nada testa o fluxo completo web → BFF → API com o mesmo ID; só cada ponta.
- Sem `MONGO_URL` (por exemplo o QA do Render, até você configurar) os traces não são guardados.
