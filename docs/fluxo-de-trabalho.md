# Fluxo de trabalho

**Última atualização: 2026-11-16 (scripts do dia a dia adicionados).** Este é o documento que toda sessão de IA lê antes de começar. Se ele e outro arquivo discordarem sobre *como trabalhar*, vale este. O dono do projeto não precisa repetir o fluxo no chat.

## Regra de ouro

**Faça só o que o dono pediu, termine e diga o que fez.** Não comece o próximo passo, não crie task, issue, comentário, PR nem branch que não foram pedidos. Em dúvida, pergunte uma vez, de forma curta.

## O que a IA pode e não pode fazer

| Pode, sem perguntar | Só quando o dono pedir | Nunca |
|---|---|---|
| Ler o repositório, editar arquivos, criar branch local, commitar, abrir PR **quando a mudança foi pedida** | Criar ou comentar issue, mover item no Project, apagar branch, mergear PR, mexer em configuração do repositório (Pages, proteção de branch), rodar a stack completa no Docker | Push direto em `main` ou `staging`, force-push, mexer na `main`, burlar a proteção de branch, colocar `Co-authored-by` ou qualquer atribuição de IA em commit ou PR |

**Commit e push na branch do PR ao terminar cada tarefa são feitos sem perguntar** (é o caminho mais barato em token). O **merge dos PRs é do dono**. A IA abre o PR, mostra o link e para.

## Idioma

- **Documentação daqui para frente: português do Brasil.** Todo documento que for criado ou atualizado passa a ficar em pt-BR, e a parte que for tocada é traduzida junto.
- Continuam em inglês: código, comentários, nomes de branch, mensagens de commit (Conventional Commits) e títulos de PR, porque o `commitlint` e as ferramentas esperam isso.
- Conversa com o dono: português do Brasil, claro e didático, explicando o porquê.

## Como uma mudança vai da ideia à `staging`

1. **Branch** a partir da `staging` atualizada: `git fetch && git checkout -b <tipo>/<nome-curto> origin/staging`. Sem task e sem número quando a mudança é pequena e avulsa.
2. **Escrever** o código, os testes e a documentação da mudança.
3. **Testar localmente só o que mudou**, antes do push, com o script do repositório:
   ```bash
   scripts/dev test
   ```
   Ele compara com a `staging`, roda só os checks que os arquivos alterados pedem e imprime uma linha por check (as últimas 40 linhas só quando falha). Mudou `apps/`: `turbo lint test build` com filtro. Mudou Python: `ruff` e `pytest`. Mudou só documentação ou `index.html`: apenas `pnpm test:scripts`. Espere o script terminar antes de dar push.
4. **Commit** em inglês, no padrão Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`), pequeno e focado. Node 20 precisa estar no `PATH` (`nvm use`).
5. **Commit, push da branch e PR para a `staging`** numa chamada só:
   ```bash
   scripts/dev pr "docs: mensagem em inglês" [arquivos...] [--tested "o que foi rodado"]
   ```
   O script recusa mensagem fora do Conventional Commits, cria a branch a partir da `staging` quando você está nela, nunca faz push em `main` ou `staging`, nunca mergeia e nunca coloca atribuição de IA. O PR sai com: o que foi feito, como foi testado e se usou IA. Para editar um PR depois, use `gh api` (o `gh pr edit` falha neste repositório).
6. **O CI decide.** Os checks obrigatórios são `commitlint` e `scripts-tests`. `typescript`, `python` e `docker` também rodam, mas ainda não bloqueiam.
7. **O dono faz o merge.** Depois, a branch só é apagada se o dono pedir.

**Fechar as issues:** o GitHub só fecha issue sozinho quando o PR vai para a `main`. Por isso o PR para a `staging` traz no corpo `Closes #361, #362` (e o PBI, `Closes #360`), e o workflow `.github/workflows/close-issues.yml` fecha essas issues quando o PR é mergeado. Mover o card para Done fica por conta da automação do próprio Project ("item closed"); isso ainda não foi verificado e o primeiro merge mostra se funciona.

Nada vai para a `main` sem o dono: o release da `staging` para a `main` é dele.

## Receitas por tipo de tarefa

Siga a receita do tipo de tarefa e **não faça** o que ela não lista. Em caso de dúvida real, pergunte uma vez. Em todas, issues, comentários, títulos de PR e commits ficam **em inglês**; só a documentação é em português.

| Tarefa | Passos | Não faça |
|---|---|---|
| **Mudança só de documentação** (`.md`, `index.html`) | Editar, `scripts/dev pr "docs: ..."`, passar o link do PR. | Testes locais (o CI cobre), ler de volta o que acabei de escrever. |
| **Mudança de código** | Editar, `scripts/dev test`, `scripts/dev pr "tipo: ..."`, passar o link. | Rodar a stack completa no Docker (só no fim de um PBI, e se o dono pedir). |
| **Criar PBI e tasks** (quando o dono pedir) | Escrever no `docs/00-backlog.md` em inglês, `scripts/import_backlog.py` (ele já atribui toda issue ao dono do repositório, `Carlos-Alexandre-Leutz`), mover os cards para In Progress, um comentário em cada issue com o link do PR. | `--verify` e `--dry-run` quando o escopo já é claro, `scripts/dev test` para texto, qualquer teste só por hábito. |
| **Apagar branches** (quando o dono pedir) | Listar o que está mergeado e sem PR aberto, apagar local e remoto, dizer o que foi apagado e o que ficou. | Apagar branch com commit que não está na `staging`: perguntar antes. |
| **Corrigir falha do CI** | `gh pr checks <número> --watch` em segundo plano, ler só o erro, corrigir, `scripts/dev test`, push. | Perguntar o status a cada 30 segundos. |

## Economizar tempo e token

- **Não conferir o que a ferramenta já confirmou.** Se o comando disse "created 4 issues" e "links added", essa é a prova. Conferência extra só com dúvida real.
- **Chamadas independentes vão na mesma mensagem**, em paralelo. Só espero uma para começar a outra quando a segunda depende do resultado da primeira.
- **Não reler o que acabei de escrever** nem o que a ferramenta já devolveu.
- **Respostas curtas.** Texto e relatório longo também custam token: digo o que fiz, o que não foi verificado e o que preciso do dono.

## Honestidade sobre testes

Diga no PR e na resposta exatamente o que foi rodado localmente e o que ficou para o CI. Nunca diga que testou o que não rodou, e nunca liste no README algo que não está implementado nem um número que não foi medido.

## Esperar o CI sem gastar token

Quando preciso corrigir uma falha, espero os checks numa chamada só, em segundo plano: `gh pr checks <número> --watch`. Logo depois do push o GitHub pode levar alguns segundos para registrar os checks; se o comando disser que não há checks, espere um pouco e chame de novo. Se o dono vai mergear de qualquer jeito, não preciso esperar: passo o link e paro.

## Scripts do dia a dia

Ficam em `scripts/` e são versionados. O pipeline não os roda: ele tem os próprios checks e é ele que decide o merge. Os testes deles estão em `tests/test_dev_script.py`.

| Comando | Para que serve |
|---|---|
| `scripts/dev test` | Roda só os checks que as mudanças pedem e imprime um resumo curto. |
| `scripts/dev pr "tipo: mensagem"` | Branch, commit, push e PR para a `staging`. O merge é do dono. |
| `scripts/dev help` | Mostra os comandos. |

Limites conhecidos: o filtro do `turbo` só enxerga dependências entre pacotes do monorepo, então uma mudança que afeta outro app sem passar por um import pode escapar (o CI pega, depois do push). O `ruff` é pulado se não estiver instalado. O `scripts/dev pr` ainda não foi rodado de ponta a ponta: o primeiro PR aberto por ele é o teste.

## Ainda não existe (planejado)

Estas melhorias foram combinadas em 2026-11-16, mas **não foram feitas**:

- **Script de contabilidade** (comentar na issue, mover o card, fechar a issue, apagar a branch). Só volta a valer a pena se o dono pedir de novo as issues e o Project em cada task.
- **Filtro por caminho nos workflows** `typescript`, `python` e `docker`, para não rodarem quando só o `README.md` ou o `index.html` mudam. Não se aplica a `commitlint` e `scripts-tests`: se eles tivessem filtro, um PR que pulasse o filtro ficaria esperando o check para sempre e o merge travaria.

## Onde cada coisa fica

As decisões que precisam ser lembradas vivem no repositório, não no chat. A tabela de onde escrever cada tipo de coisa está em [`working-agreement.md`](working-agreement.md). O estado atual e o próximo passo estão em [`project-state.md`](project-state.md), e as perguntas que só o dono responde estão em [`open-questions.md`](open-questions.md).
