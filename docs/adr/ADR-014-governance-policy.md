# ADR-014: Política de governança versionada

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

O papel de cada usuário e a regra "esta ferramenta pede aprovação" estavam espalhados: o papel dentro de cada ferramenta ([ADR-012](ADR-012-tool-layer.md)), o limite de valor numa variável de ambiente ([ADR-013](ADR-013-human-approval.md)). Para auditar e revisar o que um agente pode fazer, as regras precisam estar num só lugar, versionadas e conferidas.

## Decision

Um **arquivo de política** (`apps/api-tasks/src/policy/versions/v1.ts`, dados e não código) diz, por papel e por ferramenta, o que é permitido e com quais limites: `requiresApproval`, `maxAmountCents` (teto duro por chamada), `highValueCents` (acima dele quem aprova digita o valor), `maxCallsPerHour` e `maxCallsPerDay` (contados no log de auditoria, por ator). Quem não está listado é recusado (negar por padrão). Uma versão que já foi usada não se edita: cria-se `v2.ts` e a variável `POLICY_VERSION` escolhe (sem ela vale a mais nova).

O **validador** confere o arquivo contra as ferramentas reais quando a API sobe e lista todos os problemas de uma vez: ferramenta ou papel que não existe, papel que a própria ferramenta não aceita, campo desconhecido, limite que não é inteiro positivo, aprovação em ferramenta que não muda dados, política tentando **baixar** a aprovação que a ferramenta já exige. Um arquivo com erro impede a API de iniciar.

A política só pode ser **mais restritiva** que a ferramenta: o executor exige as duas (papel da ferramenta e papel da política). Cada entrada do log de auditoria grava `policyVersion` no resultado. Recusas por política saem como `DENIED` com o código `FORBIDDEN` ou `LIMIT_EXCEEDED`.

Os números da v1 são uma primeira proposta (compra até 10 000,00, 20 compras ou cancelamentos por dia, confirmação do valor acima de 500,00) **para o dono revisar**.

## Alternatives considered

- **JSON ou YAML carregado em tempo de execução:** exigiria configurar o build para copiar o arquivo; um módulo TypeScript é versionado, revisado em PR e conferido pelo compilador onde dá, e o validador cobre o resto.
- **Política no banco, editável pela área do dono:** muda sem revisão nem versão. Fica para quando houver necessidade.
- **Limites por chamadas na memória:** somem no reinício e não valem entre instâncias; o log de auditoria já guarda cada chamada.

## Consequences

- Há um único lugar para ler "o que um agente pode fazer".
- Contar chamadas lê o log de auditoria a cada chamada limitada (há índice por ator e data); uma recusa de entrada inválida também conta no limite, o que freia abuso.
- O teto de valor só vale para ferramentas que informam o valor (`approvalSummary`); a v1 tem duas.
- O limite global `APPROVAL_HIGH_VALUE_CENTS` continua como padrão de quem não define o seu.
