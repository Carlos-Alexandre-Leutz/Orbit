# PBI-62: Fluxo de trabalho e scripts do dia a dia

Issue: ainda não criada (o `scripts/import_backlog.py` cria as issues depois que este PR for mergeado, se o dono quiser). Pull request: #359, `docs/fluxo-pt-br` → `staging`.

## Objetivo

Deixar o fluxo de trabalho escrito num lugar que a IA lê sozinha, para o dono não repetir no chat, e cortar tempo e tokens das tarefas repetitivas (testar, commitar, abrir PR).

## O que foi entregue

| Tarefa | Resultado |
|---|---|
| Documento do fluxo | `docs/fluxo-de-trabalho.md`, em português: regra de ouro (fazer só o que foi pedido), o que a IA pode, só faz se pedirem e nunca faz, o merge é sempre do dono, passo a passo de uma mudança, como esperar o CI sem gastar token, honestidade sobre testes. O `AGENTS.md` aponta para ele e passa a dizer que o dono mergeia todo PR. |
| `scripts/dev` | `scripts/dev test` compara com a `staging`, decide quais checks as mudanças pedem (TypeScript com `turbo --filter`, Python com `ruff` e `pytest`, documentação com `pnpm test:scripts`) e imprime uma linha por check, com as últimas 40 linhas só quando falha. `scripts/dev pr "tipo: mensagem"` cria a branch, commita, dá push e abre o PR para a `staging`. |
| Registro | Este documento, a entrada no backlog e as regras em `AGENTS.md`. |

## Validação

| Critério | Resultado | Evidência |
|---|---|---|
| O fluxo está num lugar que a IA lê | **Passou** | `AGENTS.md` aponta para `docs/fluxo-de-trabalho.md`; o teste `tests/test_docs.py` continua passando. |
| `scripts/dev test` roda só o que mudou | **Passou** | 11 testes em `tests/test_dev_script.py` cobrem a classificação (documentação, `apps/web`, dependências, `services/ml`, scripts Python, commitlint, nada). Rodado nas mudanças reais: escolheu `python,scripts` e terminou em 1 segundo. |
| `scripts/dev pr` abre o PR com segurança | **Parcial** | Recusa mensagem fora do Conventional Commits (testado). Um teste garante que o texto do script não tem `Co-authored-by`, merge nem force-push. **Não foi rodado de ponta a ponta:** o primeiro PR aberto por ele é o teste. |

## Limites e o que não foi verificado

- O ramo TypeScript do `scripts/dev test` (`turbo` com filtro) não rodou, porque nenhuma mudança tocou `apps/`.
- O `ruff` não está instalado na máquina do dono, então o script o pula e avisa; o CI cobre.
- O filtro do `turbo` só enxerga dependências entre pacotes do monorepo; o CI pega o resto, depois do push.
- Ainda não existem o filtro por caminho nos workflows `typescript`, `python` e `docker` nem um script de contabilidade (issue, Project, comentários); os dois estão descritos em "Ainda não existe" no documento do fluxo.
- Não houve issues nem comentários no GitHub para este PBI, a pedido do dono.
