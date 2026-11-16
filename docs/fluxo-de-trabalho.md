# Fluxo de trabalho

**Última atualização: 2026-11-16.** Este é o documento que toda sessão de IA lê antes de começar. Se ele e outro arquivo discordarem sobre *como trabalhar*, vale este. O dono do projeto não precisa repetir o fluxo no chat.

## Regra de ouro

**Faça só o que o dono pediu, termine e diga o que fez.** Não comece o próximo passo, não crie task, issue, comentário, PR nem branch que não foram pedidos. Em dúvida, pergunte uma vez, de forma curta.

## O que a IA pode e não pode fazer

| Pode, sem perguntar | Só quando o dono pedir | Nunca |
|---|---|---|
| Ler o repositório, editar arquivos, criar branch local, commitar, abrir PR **quando a mudança foi pedida** | Criar ou comentar issue, mover item no Project, apagar branch, mergear PR, mexer em configuração do repositório (Pages, proteção de branch), rodar a stack completa no Docker | Push direto em `main` ou `staging`, force-push, mexer na `main`, burlar a proteção de branch, colocar `Co-authored-by` ou qualquer atribuição de IA em commit ou PR |

O **merge dos PRs é do dono**. A IA abre o PR, mostra o link e para.

## Idioma

- **Documentação daqui para frente: português do Brasil.** Todo documento que for criado ou atualizado passa a ficar em pt-BR, e a parte que for tocada é traduzida junto.
- Continuam em inglês: código, comentários, nomes de branch, mensagens de commit (Conventional Commits) e títulos de PR, porque o `commitlint` e as ferramentas esperam isso.
- Conversa com o dono: português do Brasil, claro e didático, explicando o porquê.

## Como uma mudança vai da ideia à `staging`

1. **Branch** a partir da `staging` atualizada: `git fetch && git checkout -b <tipo>/<nome-curto> origin/staging`. Sem task e sem número quando a mudança é pequena e avulsa.
2. **Escrever** o código, os testes e a documentação da mudança.
3. **Testar localmente só o que mudou**, antes do push:
   ```bash
   pnpm exec turbo run lint test build --filter='...[origin/staging]'
   ```
   Mudou só documentação ou `index.html`: não precisa rodar nada além do que o hook de commit já roda. Mudou Python ou scripts: `pnpm test:scripts` e `ruff check`. Espere o lint terminar antes de dar push.
4. **Commit** em inglês, no padrão Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`), pequeno e focado. Node 20 precisa estar no `PATH` (`nvm use`).
5. **Push da branch** e **PR para a `staging`** com: o que foi feito, como foi testado e se usou IA. Use `gh api` (o `gh pr edit` falha neste repositório).
6. **O CI decide.** Os checks obrigatórios são `commitlint` e `scripts-tests`. `typescript`, `python` e `docker` também rodam, mas ainda não bloqueiam.
7. **O dono faz o merge.** Depois, a branch só é apagada se o dono pedir.

Nada vai para a `main` sem o dono: o release da `staging` para a `main` é dele.

## Honestidade sobre testes

Diga no PR e na resposta exatamente o que foi rodado localmente e o que ficou para o CI. Nunca diga que testou o que não rodou, e nunca liste no README algo que não está implementado nem um número que não foi medido.

## Ainda não existe (planejado)

Estas melhorias foram combinadas em 2026-11-16, mas **não foram feitas**:

- **Script `scripts/flow`:** faz de uma vez comentar, mover o card, abrir o PR, esperar os checks e limpar a branch. Para de vez se um check falhar. Quando existir, este documento passa a descrevê-lo.
- **Filtro por caminho nos workflows** `typescript`, `python` e `docker`, para não rodarem quando só o `README.md` ou o `index.html` mudam. Não se aplica a `commitlint` e `scripts-tests`: se eles tivessem filtro, um PR que pulasse o filtro ficaria esperando o check para sempre e o merge travaria.

## Onde cada coisa fica

As decisões que precisam ser lembradas vivem no repositório, não no chat. A tabela de onde escrever cada tipo de coisa está em [`working-agreement.md`](working-agreement.md). O estado atual e o próximo passo estão em [`project-state.md`](project-state.md), e as perguntas que só o dono responde estão em [`open-questions.md`](open-questions.md).
