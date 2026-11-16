# Pagamento simulado e como o real o substitui

**Última atualização: 2026-11-16.** O pagamento do Orbit é simulado por enquanto. Este documento diz como ele funciona hoje e o que muda quando o dono tiver as chaves do Stripe. A decisão de fundo está no [ADR-004](adr/ADR-004-payments-behind-a-port.md).

## Como funciona hoje

- O cliente faz o pedido e cai em `/<loja>/orders/<id>/pay`, uma tela que mostra o resumo do pedido, um aviso de que é simulado e dois cartões de teste: um aprovado e um recusado. Nenhum número de cartão é digitado.
- O botão chama `POST /orders/:id/pay` com o método de pagamento escolhido. Se o pagamento passa, o pedido vira "Paid" e o cliente volta à página do pedido. Se é recusado, a tela mostra "Payment declined: Card declined" e o pedido continua esperando pagamento.
- Sem `STRIPE_SECRET_KEY` no ambiente, quem responde é o `FakePaymentProvider`. Em produção a API nem sobe sem as chaves (a fábrica recusa o falso).
- O painel do lojista e a página do pedido avisam que os pagamentos estão em modo de teste.

## O que o Stripe real muda

Nada nas telas nem nas regras do pedido. A porta `PaymentProvider` já tem o adaptador `StripePaymentProvider`, que nunca foi executado contra o Stripe (não há chaves).

1. O dono cria as chaves de **teste** do Stripe e coloca `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` no `.env` (e nos segredos do QA).
2. Um webhook em modo de teste aponta para `<BFF>/payments/webhook`.
3. Com as chaves, a fábrica passa a usar o adaptador do Stripe. Os cartões de teste da tela (`pm_card_visa` e `pm_card_chargeDeclined`) são métodos de pagamento de teste do próprio Stripe.
4. Só então rodar um pagamento real de teste, uma recusa, um estorno e um webhook (a lista está no [PBI-09](pbi/PBI-09.md)).

## O que ainda não existe

- Repasse ao lojista (Stripe Connect): fora de escopo; toda a venda cai numa conta de teste só.
- Pagamento com cartão de verdade: a tela nunca pede número de cartão, e quando o Stripe real entrar ela deve usar os campos hospedados do Stripe (Elements), nunca campos próprios.
