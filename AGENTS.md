# Orbit: regras para sessões de IA

Estas regras valem para qualquer ferramenta de IA ou agente que trabalhe neste repositório. O `CLAUDE.md` importa este arquivo, então o Claude Code lê o mesmo texto. Quem contribui sendo humano segue o [`CONTRIBUTING.md`](CONTRIBUTING.md), que diz as mesmas coisas com mais detalhe.

O Orbit é um agente de comércio conversacional: clientes e vendedores operam uma loja por chat, com fluxos de agentes governados, trilha de auditoria completa, RAG e previsão com scikit-learn. É um projeto de portfólio; os dados são simulados e os pagamentos estão em modo de teste. O que ele precisa fazer está em [`docs/01-requirements.md`](docs/01-requirements.md); as decisões por trás estão em [`docs/adr/`](docs/adr).

## Idioma

- Código, comentários, commits, nomes de branch e títulos de PR ficam em **inglês**. A documentação escrita ou atualizada a partir de 2026-11-16 fica em português do Brasil, e **o arquivo inteiro que você tocar é traduzido**, para não sobrar dois idiomas no mesmo documento. Exceções, que ficam em inglês: o `README.md` (é a vitrine para recrutadores dos EUA), o `CONTRIBUTING.md`, os títulos do `docs/00-backlog.md` (viram issues) e os cabeçalhos dos ADRs (`## Context`, `## Decision`, `## Alternatives considered`, `## Consequences`), que um teste exige em inglês.
- Todo texto que o sistema mostra ao usuário (páginas, mensagens da API, e-mails) fica em **inglês**, porque o produto é em inglês. Algumas mensagens e e-mails antigos da API ainda estão em português; traduza quando mexer neles.
- A única exceção é o arquivo de contexto privado do dono, que não é commitado.
- A conversa com o dono é em português do Brasil, clara e didática. O dono está aprendendo o processo, então explique o porquê, não só o quê.

## Fluxo de trabalho

- **Leia primeiro o [`docs/fluxo-de-trabalho.md`](docs/fluxo-de-trabalho.md).** Desde 2026-11-16 ele define como trabalhar (fazer só o que foi pedido, o dono mergeia os pull requests, nada de issues, comentários ou movimentos no Project sem pedido, testes locais só para o que mudou) e vale mais do que os itens abaixo sobre merge e burocracia.
- Planeje no GitHub Project (Épico → PBI → Tarefa). A fonte do backlog é `docs/00-backlog.md`.
- Épicos, PBIs e tarefas são ligados como sub-issues nativas do GitHub (épico → PBI → tarefa), e os títulos das tarefas não levam o prefixo `[PBI-nn]`. Uma tarefa criada à mão precisa entrar no backlog e ser ligada; o `scripts/import_backlog.py --verify` confere as duas coisas.
- Gitflow: `main` (produção) ← `staging` (integração) ← `pbi/<nn>-<slug>` ← `task/<nn>-<slug>`.
- Os PRs de tarefa vão para a branch do PBI. Os PRs de PBI vão para a `staging`. Os releases vão de `staging` para `main`.
- `main` e `staging` são protegidas: exigem pull request e os checks `commitlint` e `scripts-tests`, sem aprovações; não há push direto, force-push nem exclusão, e os administradores também são incluídos. Nunca dê push direto nelas. Nunca dê force-push numa branch compartilhada.
- **O dono mergeia todo pull request** na `staging` e na `main`. A IA abre o PR, passa o link e para; nunca mergeia, nem com os checks verdes.
- Um PBI só vai para a `staging` quando todas as tarefas estão feitas, os testes rodaram, os bugs foram conferidos e todo critério de aceite foi validado. Nada vai para a `main` antes de um release de verdade.
- Antes e depois de cada tarefa: achar a issue, comentar, mover o item no Project, ligar o PR, fechar.
- Depois que o PR de uma tarefa é mergeado, apague a branch `task/*`. Confira que nenhuma sobrou antes de começar o PBI seguinte. Não apague as branches `pbi/*`: quem apaga é o dono.
- **As decisões vivem no repositório, não no chat.** Tudo que precisa ser lembrado vai num ADR, no backlog, num documento de `docs/pbi/`, em `docs/open-questions.md` ou em `docs/project-state.md`, como descreve o [`docs/working-agreement.md`](docs/working-agreement.md). Atualize o `docs/project-state.md` ao fim de cada PBI e de cada sessão; passe uma sessão adiante apontando a próxima para o repositório, e não colando um resumo.
- Todo PR de tarefa documenta o que foi feito, como foi testado e se houve IA. Todo PBI concluído ganha um `docs/pbi/PBI-nn.md`.

## Commits e PRs

- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`), em inglês no imperativo, pequenos e focados.
- **Nunca adicione `Co-authored-by` nem qualquer linha de atribuição de IA a commits ou corpos de PR.** Um hook `commit-msg` do husky e o check `commitlint` do CI garantem isso (`commitlint.config.mjs`, testes: `pnpm test:commitlint`).
- Pergunte antes de ações que saem do repositório e não fazem parte do gitflow (criar issues em lote, fazer deploy, liberar para a `main`).

## Regras de engenharia

- Clean Code, SOLID, portas e adaptadores. Os testes vão junto com o código.
- Tudo que um agente pode fazer é uma ferramenta validada, com permissões por papel, idempotência e registro de auditoria. Ferramentas com efeito colateral precisam de aprovação humana.
- Conteúdo externo (produtos, avaliações, documentos) é dado, nunca instrução.
- ML: o alvo nunca é calculado por fórmula a partir das próprias features; divisões por tempo; sempre comparar com uma linha de base e reportar com honestidade.
- Nunca liste no README uma funcionalidade que não está implementada, nem um número que não foi medido.
- **O Orbit não lista lojas.** Nem a página inicial nem o menu mostram as lojas de outros lojistas: uma loja só se alcança pelo próprio link. A conta do cliente vale em todas as lojas, mas carrinho, pedidos e dados ficam por loja. Não existe `GET /stores` (a API devolve 404); o dono de uma loja a acha por `GET /stores/mine` e pelo "My store" do menu, com qualquer papel. Quem já tem loja não vê a criação de loja: a página inicial o manda para `/panel`.
- Entrega: o pedido de envio guarda o endereço (`Order.shippingAddress`), o rastreio e a janela de chegada prometida no checkout (`estimatedFrom/To`), calculada em dias úteis pelos dias da loja (`handlingDays`, `deliveryDaysMin/Max`; `orders/delivery-estimate.ts` na API, espelhada em `apps/web/lib/shipping.ts`: mudou uma, mude a outra). O vendedor pode definir a viagem por estado de destino (`Store.deliveryByState`), que substitui os dias gerais pela UF do endereço. Não há cálculo por CEP nem transportadora. Os endereços usados ficam na conta (`Address`, no máximo 5, salvos ao criar o pedido; `GET /orders/addresses`), para valer em toda loja. As migrações `20261117110000`, `20261117120000` e `20261117130000` e a `20261117140000` (nota fiscal) já foram aplicadas no banco do dono (não no QA do Render).
- Termos de Uso e Política de Privacidade ficam em `/terms` e `/privacy` (modelos, a revisar com um advogado, sem razão social nem CNPJ); o contato vem de `SUPPORT_EMAIL`. As duas palavras são reservadas em `apps/web/lib/routes.ts` e em `store-slug.ts`. A nota fiscal é do lojista: o Orbit só guarda o link https dela no pedido (`Order.invoiceUrl`, migração `20261117140000`, `POST /orders/:id/invoice`), sem emitir nada.
- Segredos nunca vão para o Git.
- Reporte com honestidade o que foi e o que não foi verificado.

## Ambiente local

- Node 20+ e pnpm 9 (`nvm use` lê o `.nvmrc`). O Node padrão da máquina do dono é o 16, que quebra o pnpm/corepack e o hook de commit; garanta o Node 20 no `PATH` antes de rodar `pnpm` ou `git commit`.
- O código base vem do `production-saas-template` (ver `docs/template-origin.md`): `apps/web` (Next.js), `apps/bff` e `apps/api-tasks` (NestJS). Ainda não há serviço de Python nem de ML.
- Testes: `pnpm test:scripts` (Python) e `pnpm test:commitlint` (Node). Os apps TypeScript usam `pnpm exec turbo run lint test build`; o `lint` só reporta, e `pnpm lint:fix` dentro de um app reescreve. O Python é checado com `ruff check services/ml scripts tests` e `pytest` em `services/ml` (`pip install -r services/ml/requirements-dev.txt`).
- Antes de um push rode `scripts/dev test` (só os checks que os arquivos alterados pedem, saída curta) e abra o PR com `scripts/dev pr "tipo: mensagem"`; ver `docs/fluxo-de-trabalho.md`. O CI ainda roda tudo e decide.
- O CI roda cinco checks em todo pull request: `commitlint`, `scripts-tests`, `typescript`, `python` e `docker`. Por enquanto só os dois primeiros são exigidos pela proteção de branch.
- Dependências do NestJS: `@nestjs/jwt` 12 e `@nestjs/mapped-types` 12 são só ES module e quebram o build CommonJS e o jest; use `@nestjs/jwt` 11 e `@nestjs/mapped-types` 2. Mantenha o código fora de `apps/api-tasks/src` fora do `tsconfig.build.json`, ou o `dist/main.js` muda de lugar e o `start:prod` quebra (um teste protege isso).
- O e-mail passa pela porta `MailTransport` (`apps/api-tasks/src/mail/`): `MAIL_PROVIDER` é `smtp` (padrão, variáveis `MAIL_*`) ou `http` (a API de e-mail do dono: `MAIL_API_URL`, `MAIL_API_TOKEN`, só texto). Esses valores nunca vão para o Git. As páginas do web nunca chamam o BFF pelo navegador (`NEXT_PUBLIC_BFF_URL` não é definida nos builds): usam as rotas `/api/session/*`. Detalhes em `docs/qa-email.md`.
- **O deploy automático do QA nunca é removido nem enfraquecido.** `.github/workflows/publish-images.yml` constrói as imagens no GitHub (o plano grátis do Render fica sem memória construindo) e o job `redeploy` chama os deploy hooks do Render (`RENDER_QA_API_HOOK`, `RENDER_QA_BFF_HOOK`, `RENDER_QA_WEB_HOOK`) a cada push na `staging`. Ele já foi removido uma vez por engano. Um workflow que falha se conserta (criar o secret, corrigir o passo), não se apaga; mudá-lo exige o "sim" explícito do dono. O `tests/test_ci.py` falha se ele sumir. Ver `docs/qa-deploy.md` e o ADR-006.
- Cada loja recebe com o provedor do próprio lojista (Stripe ou Mercado Pago, chaves coladas no painel; `docs/adr/ADR-008-sellers-receive-their-own-payments.md`). As credenciais ficam criptografadas com `PAYMENT_ENCRYPTION_KEY`, que nunca vai para o Git nem se perde (sem ela as credenciais viram lixo). `BFF_PUBLIC_URL` é o endereço do webhook que o painel mostra. O adaptador do Mercado Pago nunca rodou contra uma conta real.
- Mudou o `.env` ou um arquivo de compose: `docker restart` não relê nada; o dono recria com `docker compose -f docker-compose.dev.yml up -d --force-recreate api-tasks bff frontend`. Com a stack já no ar, o `scripts/dev up` acusa as portas do próprio Docker como "fora do Docker" (o `ss` sem `sudo` não mostra o nome do processo); é um defeito conhecido do script. Depois de uma migração nova, o dono roda `prisma generate` no contêiner da API.
- A área do dono do Orbit fica num endereço secreto, a variável `ADMIN_PATH` do `.env` (nunca no código, na documentação nem no Git; sem ela a área não existe, e ela precisa estar igual nos três serviços (web, BFF e API; em minúsculas, números e hífen, de 4 a 32 caracteres), senão a página responde "não encontrado"; só o papel `ADMIN`, que se ganha só pelo script `set-role`; ADR-009). Ela registra o plano mensal de cada loja à mão e grava toda ação em `AdminAction`; nunca mostra chaves de pagamento.
- A mensalidade do lojista (R$ 15, 30 dias grátis) é cobrada pela conta Mercado Pago do próprio Orbit (`ORBIT_BILLING_MP_ACCESS_TOKEN` e `ORBIT_BILLING_MP_WEBHOOK_SECRET`; ADR-009), não pelas contas dos lojistas. Uma loja só abre ao público com a assinatura ativa; o código nunca rodou contra o Mercado Pago. O lojista paga no próprio Orbit, sem conta no Mercado Pago: o cartão é digitado nos campos do MercadoPago.js (mesmo `MercadoPagoPaymentForm` do checkout, com `subscription`), e `POST /billing/start` recebe `cardToken` e `payerEmail` (o e-mail cobrado; o padrão é o do dono) e cria a assinatura já `authorized`. A chave pública da conta do Orbit vem de `ORBIT_BILLING_MP_PUBLIC_KEY` (na API; `GET /billing/mine` a devolve). Com credenciais de teste o Mercado Pago só aceita um pagador de teste ("Both payer and collector must be real or test users").
- A API lê o papel do usuário no banco a cada pedido (`JwtAuthGuard`), não do token: mudar ou tirar um papel vale na hora. Todo teste HTTP que usa `@Auth` precisa de um `user.findUnique` no mock do `PrismaService` (só o `role-guards.http.spec.ts` já foi ajustado; `auth`, `products`, `cart` e `orders` ainda não).
- **Nunca suba, pare, reconstrua nem reinicie os contêineres Docker do dono**, e nunca rode `scripts/dev up`: quem liga e desliga a stack é o dono. Ler (`docker compose ps`, `logs`) pode. Se um teste precisar da stack, peça ao dono para subi-la.
- Builds do Docker podem encher o disco: confira `df -h /` antes de verificar a stack completa, verifique num clone dentro da pasta do repositório (o daemon não enxerga o `/tmp` do sandbox) e remova só o que você criou.
- O `gh pr edit` falha neste repositório (erro de GraphQL do Projects clássico); use `gh api -X PATCH repos/<dono>/<repo>/pulls/<n>` e `gh api -X PUT .../merge`.
