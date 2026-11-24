# ADR-010: Log de auditoria que só aceita inserção

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

O Orbit vai deixar agentes de IA agirem por ferramentas (PBI-18). Quem audita o sistema precisa provar quem fez o quê, com qual modelo e com qual aprovação, e precisa de certeza de que ninguém, nem o próprio código com um erro, reescreve essa história. Já existe a tabela `AdminAction`, que registra só o que o admin faz com as lojas; ela não serve para as ferramentas dos agentes.

## Decision

Uma tabela nova, `audit_log` (modelo `AuditEntry`), registra cada passo de uma ferramenta: quem agiu (`actorId`, `actorRole`), a ferramenta (`tool`), os parâmetros, o resultado, o desfecho (`SUCCESS`, `FAILURE` ou `DENIED`), quem aprovou (`approverId`), o modelo e a versão do prompt. Quem escreve é o `AuditService.record`, que só sabe inserir; passando o cliente de transação, a linha entra na mesma transação da mudança que descreve.

A tabela só aceita inserção **no banco**, não só no código:

- um gatilho (`BEFORE UPDATE OR DELETE`, e outro para `TRUNCATE`) recusa a operação com o erro `audit_log is append-only`. O gatilho barra até o dono da tabela, que um `REVOKE` sozinho não barra;
- a migração também faz `REVOKE UPDATE, DELETE, TRUNCATE ... FROM PUBLIC`, para qualquer outro papel;
- `actorId` e `approverId` são texto sem chave estrangeira para `User`: apagar uma conta não pode mexer no registro do que ela fez (nem ser bloqueado por ele).

Um teste de integração no PostgreSQL (`test/audit.e2e-spec.ts`) prova que `UPDATE`, `DELETE` e `TRUNCATE` falham, por SQL e pelo cliente do Prisma. Cada tentativa roda numa transação desfeita, porque uma linha escrita ali nunca mais poderia ser apagada.

A tarefa de encadeamento por hash (evidência de adulteração) está marcada `[cut]` no backlog e **não** foi feita.

## Alternatives considered

- **Só `REVOKE` para o papel da aplicação:** o papel que roda as migrações é o dono da tabela e mantém os direitos; separar dois papéis no banco exige mudar o provisionamento do QA e da produção. Fica como passo futuro.
- **Guardar o log fora do PostgreSQL (MongoDB ou arquivo):** perde a transação com a mudança e o teste simples de integração. O MongoDB fica para os traces de execução (PBI-12).
- **Reaproveitar `AdminAction`:** mistura duas coisas (ações do admin sobre lojas e passos de agentes) e ela tem chave estrangeira para o admin.

## Consequences

- Toda ferramenta futura grava uma linha e herda a prova de que ela não muda depois.
- **Limite honesto:** quem tem acesso de superusuário ao banco ainda pode remover o gatilho ou apagar a tabela inteira. O gatilho protege contra erro de código e contra o papel da aplicação, não contra o administrador do banco. O encadeamento por hash, se for feito, cobriria isso.
- Uma linha errada não se corrige: grava-se uma nova que a explica. Dados de teste só entram dentro de transações desfeitas.
- Nada impede um chamador de pôr um dado sensível em `parameters`; a redação de dados pessoais é o PBI-15.
