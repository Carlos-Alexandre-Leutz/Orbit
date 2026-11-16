# Estado do projeto

Onde o projeto está e o que vem a seguir. Uma sessão de IA lê isto primeiro e atualiza ao fim de cada PBI e de cada sessão (ver [`working-agreement.md`](working-agreement.md)). As perguntas para o dono estão em [`open-questions.md`](open-questions.md). **Última atualização: 2026-11-16.**

## Onde estamos

A `staging` tem os PBI-01 a PBI-09, PBI-55, PBI-59, PBI-60, PBI-62, PBI-63 e PBI-64, todos com os checks verdes. Cada PBI tem um documento com as evidências e os limites: [`pbi/`](pbi).

| PBI | O que entregou |
|---|---|
| 01 a 04 | Fluxo no GitHub, base do template SaaS, documentação inicial, ambiente local |
| 05 | CI: checks de TypeScript, Python e Docker, um deploy inerte da staging, um script de tempos do pipeline |
| 06 | Papéis (cliente, vendedor, admin), sessões assinadas, guardas por papel, contas temporárias de visitante |
| 07 | Catálogo de produtos: API, busca, carga de dados de exemplo, testes de integração no PostgreSQL |
| 55 | Sessão do web (cookie httpOnly, [ADR-003](adr/ADR-003-web-session-cookie.md)), menu por papel, banner, páginas do catálogo, páginas do vendedor |
| 08 | Carrinho: modelo, regras com trava de linha, página do carrinho. A tarefa do Redis foi cortada. |
| 09 | Pedidos e pagamento de teste: máquina de estados, porta de pagamento com um falso e um adaptador do Stripe (nunca executado contra o Stripe), webhook, idempotência, cancelamento com estorno, e-mail de confirmação, páginas de checkout e de pedido. |
| 59 | Lojas e propriedade: modelo de loja e regras do link, cadastro de vendedor que cria a loja, produtos, carrinhos e pedidos por loja (dados existentes numa loja de demonstração), testes de isolamento ([ADR-005](adr/ADR-005-stores-and-storefronts.md), aceito). |
| 60 | Vitrine no link da loja: página `/<slug>` com busca, páginas de produto, carrinho, checkout e pedidos sob o link, a lista de lojas na página inicial, menu por papel e por loja. |
| 62 | Fluxo de trabalho e scripts do dia a dia (`scripts/dev test` e `scripts/dev pr`), documentados em [`fluxo-de-trabalho.md`](fluxo-de-trabalho.md). |
| 63 | E-mail do QA: porta `MailTransport` com adaptadores SMTP e HTTP (a API de e-mail do dono), falha de envio responde 503, páginas de senha pelas rotas `/api/session/*`. |
| 64 | Deploy automático do QA: o job `redeploy` do `publish-images.yml` chama os deploy hooks do Render. |

Medido em 2026-11-14 na branch do PBI-09 (o backlog tem hoje 15 épicos, 64 PBIs e 209 tarefas): API com 212 testes unitários e 68 de integração, BFF 23, web 57, `pnpm test:scripts` 86, `pnpm test:commitlint` 7; o `scripts/import_backlog.py --verify` relatou 260 itens e 0 problemas. Esses números são daquela data e não foram medidos de novo.

Ideias paradas, ainda sem tarefas: épico E13 (recuperação de carrinho por WhatsApp, [`ideas/cart-recovery-whatsapp.md`](ideas/cart-recovery-whatsapp.md)) e épico E14 (tickets de suporte com triagem por IA, [`ideas/support-tickets-ai.md`](ideas/support-tickets-ai.md)).

## Próximo passo

**O PBI-59 (lojas e propriedade) e o PBI-60 (vitrine no link da loja) estão prontos e validados** ([`pbi/PBI-59.md`](pbi/PBI-59.md), [`pbi/PBI-60.md`](pbi/PBI-60.md)). Um vendedor se cadastra com uma loja em `/<slug>`, e um comprador abre esse link, entra, enche o carrinho e compra dentro da loja. As duas escolhas do [ADR-005](adr/ADR-005-stores-and-storefronts.md) (link por caminho, uma conta de cliente para todas as lojas) foram adotadas por instrução do dono; qualquer uma ainda pode mudar.

A seguir, antes do PBI-10:

- **PBI-63** e **PBI-64** (e-mail e deploy do QA): faltam coisas do dono. Preencher no Render as variáveis de e-mail (`MAIL_PROVIDER`, `MAIL_API_URL`, `MAIL_API_TOKEN`, `APP_URL` só com o endereço do site, sem caminho), conferir que o QA atualiza sozinho depois de um merge e testar a recuperação de senha lá ([`qa-email.md`](qa-email.md), [`qa-deploy.md`](qa-deploy.md), [ADR-006](adr/ADR-006-qa-auto-deploy.md)). O gatilho de deploy nunca é removido.
- **PBI-61** painel do vendedor: layout, as páginas de produto movidas para ele, os pedidos da loja com enviar e entregar, edição do nome e da descrição da loja. Hoje o vendedor gerencia produtos em `/seller/products` e lê um pedido por id pela API, mas não consegue listar os pedidos da loja numa página, e o admin não vê pedidos de loja nas páginas.

Depois, PBI-42 e PBI-43 com o dono (o primeiro deploy). O PBI-10 (página de chat com streaming) ainda precisa de um agente falso atrás de uma porta e de um ADR de streaming; ele espera. O dono ainda precisa dizer o que tem de existir antes do primeiro deploy público (ver [`open-questions.md`](open-questions.md)).

O PBI-09 está descrito em [`pbi/PBI-09.md`](pbi/PBI-09.md), com evidências e limites. Os que uma próxima sessão deve lembrar:
- `StripePaymentProvider.charge` e `.refund` nunca foram executados contra o Stripe (não há chaves); só a assinatura do webhook é testada. O dono fornece as chaves de teste; então rodar um pagamento real, uma recusa, um estorno e um webhook. O modelo (PBI-17) está na mesma situação: sem chave do Gemini, então usar um falso atrás da porta.
- Um pedido não pago mantém o estoque até ser cancelado; nada expira os antigos.
- Nenhuma página envia nem entrega pedidos ainda, só a API (o PBI-61 as adiciona).

Limites do PBI-59 que uma próxima sessão deve lembrar: o dono da loja de demonstração (`demo-seller@orbit.invalid`) não consegue entrar; um admin não tem loja, então não cria nem edita produtos; uma nova página de primeiro nível do web precisa ser adicionada aos links reservados da API (`store-slug.ts`) e a `apps/web/lib/routes.ts`.

## Como uma tarefa e um PBI são feitos

- Planeje a partir da issue; branch `task/<nn>-<slug>` a partir da branch do PBI, que sai da `staging`. Nunca dê push na `main` nem na `staging`.
- Escreva os critérios de aceite do PBI na issue antes de começar. Comente em cada issue de tarefa, mova no Project, abra o pull request (o que foi feito, como foi testado, o que **não** foi verificado, que houve IA), espere os seis checks, mergeie pelo `gh api` (o `gh pr edit` falha aqui), apague a branch da tarefa, feche a issue.
- Uma issue nova para o Project precisa de `gh project item-add` e depois `scripts/setup_project.py` para definir Fase e Prioridade. Uma tarefa adicionada ao backlog é criada pelo `scripts/import_backlog.py`; o `--verify` dele deve terminar com 0 problemas.
- No fim de um PBI, confira **cada** critério de verdade: no back end, a stack completa do Compose pelo BFF; no front end, um navegador real. Escreva o `docs/pbi/PBI-nn.md` e abra o pull request do PBI para a `staging`.

## Armadilhas do ambiente

- O Node padrão é o 16. Ponha o Node 20 no `PATH` antes de `pnpm` ou `git commit`.
- O daemon do Docker não enxerga o `/tmp` do sandbox. Verifique a stack completa num clone **dentro da pasta do repositório** (por exemplo `.verifyNN`, listado em `.git/info/exclude`), depois rode `docker compose -p <projeto> down -v --rmi local` e apague o clone.
- A stack do próprio dono usa as portas 3000 a 3002 e o contêiner `orbit-postgres-db`. Num clone de verificação, mude as portas publicadas (13000 a 13002), `POSTGRES_PORT`, `MONGO_PORT` e o `container_name`. Nunca pare os contêineres do dono.
- Comandos que passam de uns dois minutos vão para segundo plano: espere a notificação em vez de ficar consultando. O check do Docker leva uns quatro minutos por pull request.
- O Next.js aqui é a versão 16: leia `apps/web/node_modules/next/dist/docs` primeiro (`middleware` virou `proxy`, `cookies()` e os parâmetros de rota são assíncronos).
- `@nestjs/jwt` e `@nestjs/mapped-types` na versão 12 são só ES module; use a 11 e a 2.x. Código fora de `apps/api-tasks/src` precisa ficar fora do `tsconfig.build.json`. Um componente de cliente não pode importar código só de servidor, como `next/headers`.
- Não dê push antes de o lint local terminar: um pull request aberto cedo demais já falhou no CI por isso.
- No computador do dono, os contêineres precisaram de regras de firewall à mão (`sudo iptables -I DOCKER-FORWARD ...` para a ida e para a volta da rede do Orbit) e de `sysctl net.bridge.bridge-nf-call-iptables=0`; as duas coisas somem no reboot. Sem elas, a API não alcança o banco nem a internet (o e-mail falha com timeout).
- `scripts/dev up` (só o dono roda) sobe a stack de desenvolvimento e **não** reconstrói imagens: depois de mudar o código da API, `docker compose up -d --build --force-recreate api-tasks`.

## Disco

Em 2026-11-14 o disco estava 97% cheio (uns 7,6 GB livres) porque o cache de build do Docker tinha crescido para uns 39 GB. Limpar o cache de build e três imagens antigas de verificação levou a uns 43 GB livres (81%). Uma verificação da stack completa custa alguns GB. Se o espaço livre chegar perto de 5 GB, pare e avise o dono. O Docker guarda os dados em `/var/snap/docker/common/var-lib-docker` (instalação por snap).

O dono tem um SSD de 1 TB para projetos de IA e pode mover os dados do Docker para lá. Os passos: conectar e montar com sistema de arquivos ext4 por UUID no `fstab`; fazer backup dos volumes dos bancos; parar o Docker; `rsync` do diretório para o SSD; apontar a raiz de dados do Docker para ele; iniciar o Docker; conferir que os contêineres e volumes estão intactos; só então apagar o diretório antigo. Formatar apaga o disco, então o dono confirma esse passo.

## Riscos conhecidos (detalhes nos documentos dos PBIs)

- `POST /auth/anonymous` é público e cria uma linha por chamada; não há limite de requisições em login nem em cadastro; os tokens de recuperação de senha ficam em texto puro; a API da loja ainda tem `enableCors()` aberto e a porta publicada.
- As mensagens de erro da API e os e-mails ainda estão em português e as páginas em inglês; o produto deve ser todo em inglês, então falta traduzir (a regra está no `AGENTS.md`).
- Ainda não verificado: o deploy da staging (o placeholder só escreve uma nota; o QA é atualizado pelo job `redeploy`, que depende dos secrets do dono), o acerto de cache do Turborepo no CI, o cookie `Secure` em https, o layout no celular e a expiração de 24 horas de uma conta de visitante.

## Ritmo até aqui

Horários de merge em 2026-11-14 (do histórico do Git da `staging`): PBI-05 às 11:27, PBI-06 às 12:36, PBI-07 às 13:24, PBI-55 às 18:54, PBI-08 às 19:33. Entre 13:24 e 18:54 o tempo foi sobretudo para reescrever o backlog, as ideias paradas, o espaço em disco e pausas. Sem interrupções, um PBI de 3 a 5 tarefas, com a validação da stack completa e o documento, levou uns 40 a 70 minutos, cerca de 13 minutos por tarefa. Em 2026-11-14 o backlog tinha 38 PBIs e 139 tarefas restantes, sem contar os épicos parados E13 e E14; uns 33 desses PBIs não dependem do dono (o servidor, o deploy, os backups e o vídeo de lançamento dependem). Uma estimativa realista para eles é de 45 a 60 horas de trabalho ativo, porque os PBIs de agente, RAG, aprendizado de máquina e avaliação são mais lentos que os da loja. É uma estimativa a partir de cinco pontos, não uma promessa.
