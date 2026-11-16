# PBI-64: Deploy automático do QA

Issue: #369. Tarefas: #370, #371, #372. Decisão: [ADR-006](../adr/ADR-006-qa-auto-deploy.md). Guia: [`qa-deploy.md`](../qa-deploy.md).

## Objetivo

Restaurar o gatilho que atualiza o QA no Render a cada merge na `staging`, e impedir que ele seja removido de novo. O gatilho do template foi removido na PBI-05 e o QA atual (imagens no GHCR) nunca teve um.

## O que foi entregue

| Tarefa | Resultado |
|---|---|
| #370 Gatilho | Job `redeploy` em `publish-images.yml`, depois de `publish` e `migrate`, que chama os deploy hooks `RENDER_QA_API_HOOK`, `RENDER_QA_BFF_HOOK` e `RENDER_QA_WEB_HOOK`. Secret ausente: aviso e resumo; hook recusado: falha. |
| #371 Testes | Dois testes em `tests/test_ci.py`: o job existe, vem depois de `migrate` e usa os três secrets; o guia, o ADR-006 e a regra no `AGENTS.md` existem. |
| #372 Documentação | ADR-006, `docs/qa-deploy.md`, regra no `AGENTS.md` e `docs/project-state.md`. |

## Validação

| Critério | Resultado | Evidência |
|---|---|---|
| O gatilho está no workflow e protegido por teste | **Passou** | `python3 -I -m unittest discover -s tests`: 99 testes, OK. |
| Um merge atualiza o QA | **Não verificado** | Exige os três secrets, que só o dono cria. O primeiro merge depois de criá-los é o teste. |

## Limites

- Presumo que o deploy hook de um serviço com imagem baixa de novo a tag `latest`; conferir no primeiro merge.
- O hook é uma URL secreta e fica só em secrets do GitHub.
