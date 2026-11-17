# PBI-72: Plataforma de lojas pronta para o QA

Issue: #416. Tarefa: #417. Pull request: `pbi/72-store-platform-qa` → `staging`. Decisões em [ADR-008](../adr/ADR-008-sellers-receive-their-own-payments.md) e [ADR-009](../adr/ADR-009-orbit-admin-and-seller-plan.md).

## Objetivo

Reunir num só PBI o trabalho feito depois do PR #414 e que ainda não estava commitado: o lojista cria a conta e a loja, recebe com o provedor dele, paga a mensalidade do Orbit e entrega pedidos; o dono do Orbit acompanha as lojas numa área própria. O objetivo é levar tudo isso ao QA para testar com contas de teste.

**Este PBI foi escrito com a instrução "só código, sem testes".** Nada do que está abaixo foi executado de ponta a ponta nem coberto por testes novos; ver Limites.

## O que foi entregue

### Conta, onboarding e loja

- **Uma conta do Orbit para tudo.** `/sell` cria a conta (nome, e-mail, senha); a loja é criada depois, dentro do painel. Quem só comprou abre loja com a mesma conta (`POST /auth/store`, que devolve uma sessão com o papel `SELLER`). O lojista também compra em outras lojas.
- **Onboarding em 3 passos** (`StoreOnboarding`): o que vender, o template (`classic`, `bold`, `minimal`) e o nome com o link. A loja nasce em **rascunho** (`Store.published=false`), só o dono a vê, e o botão Publish fica no início do painel. As lojas antigas continuam publicadas.
- **O Orbit não lista lojas.** A página inicial e o menu não mostram as lojas de outros lojistas; uma loja só se alcança pelo link. O `GET /stores` foi removido. Quem tem loja cai direto no painel (`/panel`) ao abrir a página inicial ou entrar; "My store" aparece no menu para qualquer dono de loja.
- A API lê o papel do usuário no banco a cada pedido (`JwtAuthGuard`), não do token: mudar ou tirar um papel vale na hora.

### Vitrine e painel

- Vitrine clara, no estilo de loja de verdade: `StoreHeader`, banners em carrossel (até 5), faixa de benefícios, "Shop by category", cartões com foto, rodapé em colunas, botão de voltar ao topo.
- **Categorias por loja** (`Category.storeId`): o dono cria, renomeia e apaga em `/panel/categories`.
- **Destaques sob o banner** (`Store.highlights`, até 4 de 8 opções) em `/panel/highlights`.
- **Imagens:** botão "Choose image"; a foto antiga é apagada ao trocar, ao remover a foto ou o produto, e envios nunca salvos com mais de 1 hora são limpos a cada upload (`ImageStorage.removeUnused`).

### Pagamentos de cada loja (ADR-008)

- Cada loja recebe com o provedor do próprio lojista, **Stripe ou Mercado Pago**, com as chaves coladas em `/panel/payments`. As credenciais ficam criptografadas com `PAYMENT_ENCRYPTION_KEY` (`credential-cipher.ts`) e nunca voltam para o navegador.
- Adaptadores `StripePaymentProvider` e `MercadoPagoPaymentProvider`, escolhidos por loja (`store-payment-provider.registry.ts`); webhook por loja (`/payments/webhook/:slug`).
- Em produção, sem provedor conectado, o pagamento é recusado (`UnavailablePaymentProvider`): o provedor falso nunca roda lá.

### Área do dono e mensalidade do lojista (ADR-009)

- **Área do dono** num endereço secreto (`ADMIN_PATH`, nunca no código nem no Git), só para o papel `ADMIN`: lista de lojas, detalhe, registrar pagamento, suspender e reativar, e o preço de cada plano. Toda ação é gravada em `AdminAction` na mesma transação. Nunca mostra chaves de pagamento.
- **Mensalidade** (R$ 15, 30 dias grátis) cobrada pela conta Mercado Pago do próprio Orbit (`ORBIT_BILLING_MP_ACCESS_TOKEN` e `ORBIT_BILLING_MP_WEBHOOK_SECRET`), página `/panel/billing`. Uma loja só abre ao público com a assinatura ativa ou um pagamento registrado pelo dono; uma loja suspensa fica fechada.

### Entrega

- **Endereço do cliente no checkout** (`Order.shippingAddress`): nome, telefone, CEP, rua, número, complemento, bairro, cidade e estado. Os endereços usados ficam na conta (`Address`, no máximo 5, `GET /orders/addresses`), e o cliente escolhe um deles ou "Use another address".
- **Previsão de chegada** em dias úteis, calculada na API e gravada no pedido (`estimatedFrom` e `estimatedTo`): dias de preparo mais a viagem curta e a longa da loja (`handlingDays`, `deliveryDaysMin` e `deliveryDaysMax`). O vendedor pode definir a viagem por estado de destino (`Store.deliveryByState`), que substitui os dias gerais. Não há cálculo por CEP nem transportadora. A regra existe na API (`delivery-estimate.ts`) e no web (`lib/shipping.ts`): mudou uma, mude a outra.
- **Gestão pelo vendedor** em `/panel/orders`: endereço de entrega, janela de chegada, código de rastreio (digitado ao marcar como enviado) e **link da nota fiscal** (`Order.invoiceUrl`, `POST /orders/:id/invoice`, só `https`). O cliente vê a previsão, o rastreio e o link na página do pedido. O Orbit não emite nota fiscal.
- Frete fixo, frete grátis acima de um valor e retirada na loja, em `/panel/shipping`.

### Termos e privacidade

- `/terms` e `/privacy` (modelos, em inglês), links nos rodapés e aviso nos dois cadastros. O contato vem de `SUPPORT_EMAIL`. As duas palavras são reservadas em `apps/web/lib/routes.ts` e em `store-slug.ts`. **Os textos precisam de revisão de um advogado** e não têm razão social nem CNPJ.

## Migrações

`20261116140000_add_store_onboarding_and_shipping`, `20261116150000_add_store_categories_and_highlights`, `20261116160000_add_store_banners`, `20261116170000_add_store_payment_provider`, `20261116180000_add_admin_billing`, `20261116190000_add_store_subscription`, `20261117100000_add_plan_prices`, `20261117110000_add_delivery_management`, `20261117120000_add_saved_addresses`, `20261117130000_add_delivery_by_state` e `20261117140000_add_order_invoice`. O CI as aplica no QA (job `migrate`, secret `NEON_DATABASE_URL`).

## Variáveis de ambiente novas

`ADMIN_PATH` (API, BFF e web), `PAYMENT_ENCRYPTION_KEY`, `ORBIT_BILLING_MP_ACCESS_TOKEN` e `ORBIT_BILLING_MP_WEBHOOK_SECRET` (API), `BFF_PUBLIC_URL`, `STRIPE_PUBLISHABLE_KEY` e `SUPPORT_EMAIL` (web). Os valores nunca vão para o Git; os exemplos estão no `.env.example`.

## Validação

Feita só no banco e na stack de desenvolvimento do dono: as migrações foram aplicadas no PostgreSQL do contêiner, a API e o web subiram, e o painel de pedidos foi aberto depois de reiniciar o web. O `tsc` do web passou em dois momentos do trabalho. **Não foram rodados testes unitários, de integração nem lint desta leva.**

## Limites

- **Testes que vão quebrar e não foram corrigidos:** `test/stores.e2e-spec.ts` e `src/stores/stores.service.spec.ts` (campos novos e a lista removida), `src/stores/stores.panel.spec.ts`, os specs de pedidos (`orders.service.spec.ts`, `orders.http.spec.ts`: o envio agora exige endereço e a loja traz os dias de entrega), `test/isolation.e2e-spec.ts`, `test/cart.e2e-spec.ts`, os testes HTTP que usam `@Auth` (precisam de `user.findUnique` no mock do `PrismaService`; só o `role-guards.http.spec.ts` foi ajustado) e qualquer teste que use `GET /categories`. Há seis testes de menu e uma suíte nova que passaram só no começo; o CI diz o resto.
- **Nenhum dinheiro real rodou:** os adaptadores do Stripe e do Mercado Pago, a assinatura da mensalidade e os webhooks nunca foram executados contra um provedor. Falta rodar um pagamento, uma recusa, um estorno e um webhook em cada, e uma assinatura de teste, uma falha e um cancelamento da mensalidade.
- Um pedido não pago mantém o estoque até ser cancelado; nada expira os antigos. Só o cartão existe como forma de pagamento.
- A previsão de entrega é a regra de dias que o vendedor digita; não há transportadora, preço de frete por CEP nem rastreio automático.
- A nota fiscal é só um link; o lojista a emite fora do Orbit.
- As fotos ficam no PostgreSQL. O rascunho ainda não é escondido também na API: os produtos de uma loja em rascunho saem por `GET /products?store=`. O "o que vender" do onboarding ainda não muda nada.
- Os testes de isolamento entre lojas são unitários (Prisma simulado); falta um teste de integração no PostgreSQL com duas lojas.
- As telas de produto, carrinho, checkout e painel não foram vistas no celular nem em todas as larguras.
- A conta do dono do Orbit (`ADMIN`) não tem painel de lojista: o `/panel` e o `GET /stores/mine` exigem `SELLER`. A área do dono precisa de endurecimento antes do primeiro cliente real (verificação em duas etapas, limite de tentativas), listado em `open-questions.md`.
- Os textos de termos e privacidade são modelos, sem revisão jurídica.
