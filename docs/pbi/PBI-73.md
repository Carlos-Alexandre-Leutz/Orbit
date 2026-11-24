# PBI-73: Mensalidade do lojista com formulário de cartão dentro do Orbit

Pull request: `pbi/73-seller-card-billing` → `staging`. Decisão em [ADR-009](../adr/ADR-009-orbit-admin-and-seller-plan.md). O objetivo era testar a mensalidade no QA com contas de teste do Mercado Pago.

## Por que

No primeiro teste no QA o lojista era levado à página do Mercado Pago, que pode exigir uma conta lá, e o Mercado Pago recusou a assinatura com "Both payer and collector must be real or test users", porque o e-mail do dono da loja não era de um usuário de teste. O dono quer que o lojista pague só com cartão de crédito, sem precisar de conta no Mercado Pago.

## O que foi entregue

- **Formulário de cartão na página Billing** (`/panel/billing`). Reaproveita o `MercadoPagoPaymentForm` do checkout com o modo `subscription`: os campos do cartão são do MercadoPago.js, então o Orbit só recebe um token. O botão antigo que redirecionava (`StartTrialButton`) foi removido.
- **Assinatura criada no Orbit.** `POST /billing/start` recebe `cardToken` e `payerEmail`, cria a assinatura no Mercado Pago com `card_token_id` e `status: authorized`, guarda o status e o fim dos 30 dias grátis. O webhook continua confirmando e tratando falhas.
- **E-mail cobrado escolhido pelo lojista.** O campo começa com o e-mail da conta e pode ser trocado antes do envio. Se vier vazio, a API usa o e-mail do dono.
- **Chave pública:** `GET /billing/mine` devolve `publicKey`, lida de `ORBIT_BILLING_MP_PUBLIC_KEY` (só na API). Sem ela, a página avisa que o formulário não está configurado.
- **Publicar sem plano:** ao clicar em "Publish store" sem plano (resposta 402), abre um alerta que oferece iniciar o teste grátis e leva ao Billing.
- **Menu do admin:** o link "My store" não aparece para o papel `ADMIN`.

## Variáveis de ambiente

Só uma nova, na API: `ORBIT_BILLING_MP_PUBLIC_KEY` (a Public Key das credenciais da conta Mercado Pago do Orbit). Continuam valendo `ORBIT_BILLING_MP_ACCESS_TOKEN`, `ORBIT_BILLING_MP_WEBHOOK_SECRET`, `APP_URL` e `BFF_PUBLIC_URL`.

## Limites

- **Nunca rodou contra o Mercado Pago.** A criação de assinatura com `card_token_id` segue a documentação pública; campos obrigatórios a mais ou diferenças no teste podem aparecer no primeiro uso.
- Em modo de teste, o e-mail cobrado precisa ser o de um usuário de teste comprador.
- O token do cartão vale pouco tempo e uma vez: se a assinatura falhar, o lojista digita o cartão de novo.
- Cartão de débito, Pix e boleto não existem na mensalidade (assinaturas recorrentes do Mercado Pago são no cartão de crédito).
- Os testes automáticos novos desta mudança não foram escritos; valem o `scripts/dev test` e o CI.
