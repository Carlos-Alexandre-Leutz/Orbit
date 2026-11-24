# PBI-14: Política de governança

Pull request: `pbi/14-governance-policy` → `staging`. **Depende dos PRs #430 a #434** (a branch sai da do PBI-13). Decisão em [ADR-014](../adr/ADR-014-governance-policy.md).

## O que foi entregue

- **Arquivo de política versionado** (`policy/versions/v1.ts`): papéis × ferramentas × limites (aprovação, teto de valor, valor alto, chamadas por hora e por dia).
- **Carregador e validador:** `loadPolicy` escolhe a versão (`POLICY_VERSION`), `validatePolicy` confere tudo contra as ferramentas reais e impede a API de iniciar se houver erro.
- **Aplicação no executor:** papel da política, tetos, contagem de chamadas pelo log de auditoria, aprovação forçada e limite de valor alto por ferramenta; recusas auditadas como `DENIED`, com `policyVersion` em toda entrada.
- Novo código de erro `LIMIT_EXCEEDED`.

## Critérios de aceite

| Critério | Prova |
|---|---|
| Arquivo versionado papéis × ferramentas × limites | `versions/v1.ts` |
| Carregador e validador | `governance-policy.spec.ts` (validador com onze erros, versão, carregador) |
| Testes de permissão por papel | `governance-policy.spec.ts` (cliente, vendedor, admin, ferramenta não listada, teto, contagens) e `tool-executor.spec.ts` ("governance policy") |

## Limites

- Os números da v1 são um palpite para você revisar.
- Os tetos de valor só valem para ferramentas com `approvalSummary` (hoje `orders.place` e `orders.cancel`).
- A contagem lê o log de auditoria; sem teste de carga, e nenhum teste de integração em PostgreSQL da contagem.
- Não há tela para ver ou editar a política; ela muda por pull request.
