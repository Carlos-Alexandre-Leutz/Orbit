# PBI-69: Pagamento simulado

Issue: #406. Tarefas: #407, #408, #409. Pull request: `pbi/68-69-storefront-payment` → `staging`. Decisões no [ADR-004](../adr/ADR-004-payments-behind-a-port.md) e no [ADR-007](../adr/ADR-007-sign-up-flows-and-global-customer-account.md).

## Objetivo

Simular a parte de pagamento enquanto o Stripe não entra, com uma tela que se pareça com um checkout.

## O que foi entregue

| Tarefa | Resultado |
|---|---|
| #407 Tela de pagamento simulado | `/<loja>/orders/<id>/pay`: resumo do pedido, aviso de simulação e dois cartões de teste (aprovado e recusado). Depois de fazer o pedido o cliente vai direto para essa tela; a página do pedido ganhou o botão "Pay now" que leva a ela. A mensagem de recusa da API foi traduzida para o inglês ("Payment declined"). |
| #408 Modo de teste visível | Aviso no painel do lojista e na página do pedido. |
| #409 Como o pagamento real entra | [`pagamento-simulado.md`](../pagamento-simulado.md): como funciona hoje e os passos para o Stripe de teste. |

## Validação

Feita em 2026-11-16 na stack do dono, no navegador: o cliente abriu a tela de pagamento de um pedido pendente, pagou com o cartão recusado (a tela mostrou "Payment declined: Card declined" e o pedido continuou pendente), depois com o aprovado, e a página do pedido mostrou "Paid" com o aviso de modo de teste.

## Limites

- Continua sem o Stripe real (ver o documento acima). Um pedido não pago mantém o estoque até ser cancelado; nada expira os pedidos antigos.
- Outras mensagens da API ainda estão em português (por exemplo "Produto sem estoque").
