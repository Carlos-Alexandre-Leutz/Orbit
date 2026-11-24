# ADR-008: Cada lojista recebe os próprios pagamentos e paga as taxas

- **Status:** Proposed
- **Date:** 2026-11-16

## Context

O [ADR-004](ADR-004-payments-behind-a-port.md) pôs o pagamento atrás de uma porta, mas assumiu uma conta de pagamento só, a do dono do Orbit. O Orbit é uma plataforma: o lojista se cadastra, cria a loja e vende ([ADR-007](ADR-007-sign-up-flows-and-global-customer-account.md)). Com uma conta só, todo o dinheiro das vendas cairia na conta do dono do Orbit, que teria de repassá-lo aos lojistas (dinheiro de terceiros passando por ele, com implicações legais e fiscais) e pagaria as taxas do provedor por vendas que não são dele.

O dono decidiu em 2026-11-16: ele não quer pagar as taxas das vendas dos lojistas. O custo do pagamento é do lojista, que só paga quando vende. Conectar a conta de pagamento é um passo a mais no cadastro, e o dono aceita esse custo para começar.

## Decision

Decidido com o dono em 2026-11-16 e **escrito no código, mas nunca executado contra um provedor de verdade** (não há contas nem chaves).

- **Cada lojista escolhe o próprio provedor** entre Stripe e Mercado Pago, e **cola no painel** (`/panel/payments`) a chave pública, a chave secreta (ou o token de acesso) e o segredo do webhook da conta dele. Não há OAuth nem Connect: funciona com qualquer conta comum, sem aprovação de plataforma e sem depender de o Stripe Connect existir no Brasil.
- A loja guarda `paymentProvider`, `paymentPublicKey` (pública, o navegador precisa dela) e `paymentCredentials`. As credenciais ficam **criptografadas** (AES-256-GCM, chave `PAYMENT_ENCRYPTION_KEY`) e nunca são devolvidas por nenhuma rota. Sem a chave de criptografia a API recusa salvar.
- A cobrança é feita **com as credenciais do lojista**: o dinheiro cai na conta dele, a taxa do provedor sai dela, e estornos e contestações ficam com ela. O Orbit nunca segura dinheiro de terceiros nem paga taxa de venda.
- A porta `PaymentProvider` continua a mesma; `StorePaymentProviders` escolhe o adaptador da loja (Stripe ou `MercadoPagoPaymentProvider`). Cada loja tem o próprio webhook, `POST /payments/webhook/:slug`, verificado com o segredo da loja. O webhook geral (`/payments/webhook`) continua, para o provedor da plataforma.
- **Fora de produção**, uma loja sem provedor usa o da plataforma (chaves do `.env` ou o falso), para desenvolver. **Em produção**, uma loja sem provedor não aceita pagamento (`PAYMENT_NOT_CONFIGURED`), e sem chaves da plataforma o provedor da plataforma recusa tudo; o falso nunca roda em produção.
- No navegador, o cartão é digitado em campos que o próprio provedor desenha (Stripe.js ou MercadoPago.js), então o número nunca passa pelo Orbit; o Orbit recebe só um id (`pm_...`) ou um token de uso único.
- Uma comissão da plataforma por venda **não existe**: com chaves coladas o Orbit não tem como cobrá-la.
- Pix e boleto não estão incluídos.

## Alternatives considered

- **Uma conta de pagamento só, do dono, repassando aos lojistas.** É o mais simples de construir, mas o dono paga as taxas, segura dinheiro de terceiros e assume o risco legal e fiscal. Contraria a decisão do dono.
- **Lojista cobra por fora (link de pagamento próprio).** Não precisa de integração, mas o Orbit perde o pedido, o webhook e o estorno, que são o centro do produto.
- **Stripe Connect (contas Standard), com o botão "Conectar".** É a experiência melhor e permitiria comissão, mas depende de o Connect existir para o dono no Brasil e de aprovação como plataforma. Fica como evolução se uma comissão for desejada.
- **Contas "Express" ou "Custom" do Connect, em que a plataforma monta o cadastro do lojista.** A experiência é melhor, mas a plataforma assume mais responsabilidade (cadastro, risco, contestações) e a conta Standard resolve o que o dono quer hoje.
- **Outros provedores** (Pagar.me, Asaas). Entram como mais um adaptador atrás da porta, sem mexer nas regras do pedido.

## Consequences

- O dono não paga taxa de venda nenhuma, e o modo de teste continua grátis. Mas **não há comissão** para o Orbit.
- O cadastro do lojista fica mais longo: ele precisa de uma conta no provedor, de copiar três valores e de criar o webhook. Pode afastar quem só quer experimentar.
- **Guardar segredos de terceiros é uma responsabilidade nova.** Perder a `PAYMENT_ENCRYPTION_KEY` torna todas as credenciais ilegíveis (cada lojista reconecta); vazá-la junto com o banco expõe as chaves. As chaves têm de ficar no cofre do ambiente, nunca no Git.
- O adaptador do Mercado Pago foi escrito da documentação e **nunca rodou**; o formato da assinatura do webhook, o campo `payment_method_id` e o estorno são os pontos mais prováveis de precisar de ajuste. O do Stripe também nunca rodou contra o Stripe de verdade.
- A moeda do pedido ainda é `USD` por padrão; o Mercado Pago só cobra na moeda do país da conta (BRL no Brasil). Falta definir a moeda por loja.
- Cartões com autenticação extra (3D Secure) ainda falham no Stripe: o servidor confirma o pagamento sozinho.
- A idempotência, o webhook e os estornos do [ADR-004](ADR-004-payments-behind-a-port.md) continuam valendo.
- Quando for revisado e testado com contas reais, o ADR passa para "Accepted" e vira um PBI no backlog.
