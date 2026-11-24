# PBI-11: Log de auditoria que só aceita inserção

Pull request: `pbi/11-audit-log` → `staging`. Decisão em [ADR-010](../adr/ADR-010-append-only-audit-log.md). Primeiro PBI do épico E3.

## O que foi entregue

- **Tabela `audit_log`** (migração `20261124120000_add_audit_log`): data, ator e papel, ferramenta, parâmetros, resultado, desfecho, aprovador, modelo e versão do prompt, com índices por ator e por ferramenta.
- **Módulo `AuditModule` (global)** com `AuditService.record(entry, db?)`: só insere, recusa nome de ferramenta vazio e aceita o cliente de uma transação.
- **Só inserção no banco:** gatilhos que recusam `UPDATE`, `DELETE` e `TRUNCATE`, mais `REVOKE` para os outros papéis.
- **Teste que prova** (`test/audit.e2e-spec.ts`, PostgreSQL de verdade): o insert e a leitura funcionam; `UPDATE`, `DELETE` e `TRUNCATE` falham, por SQL e pelo Prisma.
- Encadeamento por hash: marcado `[cut]`, não feito.

## Critérios de aceite

| Critério | Como foi conferido |
|---|---|
| Uma linha guarda ator, papel, ferramenta, parâmetros, resultado, aprovador, modelo e versão do prompt | `audit.service.spec.ts` (todos os campos) |
| O banco recusa alterar ou apagar | `audit.e2e-spec.ts` |
| O serviço não tem como alterar nem apagar | `audit.service.spec.ts` (só `record`) |

## Limites

- O gatilho não protege contra um superusuário do banco (ver o ADR-010).
- Nenhuma ferramenta grava no log ainda; isso vem com o PBI-18. A página de consulta é do PBI-16.
- Nada redige dados pessoais em `parameters` (PBI-15).
