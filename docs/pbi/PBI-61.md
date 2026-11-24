# PBI-61: Painel do lojista

Issue: #338. Tarefas: #339, #340, #341, #342, #375, #376. Pull request: `pbi/61-seller-panel` → `staging`. Decisões no [ADR-005](../adr/ADR-005-stores-and-storefronts.md) e no [ADR-007](../adr/ADR-007-sign-up-flows-and-global-customer-account.md).

## Objetivo

Dar ao lojista um lugar só, `/panel`, para gerenciar a própria loja: produtos, pedidos, clientes e configurações.

## O que foi entregue

| Tarefa | Resultado |
|---|---|
| Layout do painel | `/panel` com menu lateral (Overview, Products, Orders, Customers, Store settings, View my store). Só o lojista entra; um cliente recebe "not found". Cadastro e login do lojista caem no painel; o menu dele ganhou "Panel". |
| Produtos no painel | As páginas de produto foram movidas para `/panel/products`; os endereços antigos `/seller/products...` redirecionam. O admin não tem loja, então perdeu esse atalho. |
| Pedidos da loja | `GET /orders/store` (só lojista, loja da sessão) e `/panel/orders` com cliente, itens, total e os botões "Mark as shipped" e "Mark as delivered". |
| Nome e descrição | `GET` e `PATCH /stores/mine` e `/panel/settings`. O link nunca muda. |
| Início do painel | `GET /stores/mine/summary` e `/panel` com pedidos pagos esperando envio, vendas, produtos ativos, estoque baixo (5 ou menos) e clientes. |
| Checklist "Publish your store" | Três passos no início do painel: descrever a loja, adicionar o primeiro produto e compartilhar o link. A loja não tem estado de rascunho: ela já está no ar. |
| Clientes da loja | `/panel/customers`, usando o `GET /store-customers` do PBI-70. |

## Validação

Feita em 2026-11-16 na stack do dono (código recarregado sozinho): as seis páginas do painel responderam 200 para o lojista; `/seller/products` redirecionou para `/panel/products`; o lojista criou um produto, um cliente se cadastrou na loja, comprou 2 unidades e pagou; o painel mostrou "Mark as shipped", o envio respondeu SHIPPED e o resumo trouxe 1 produto, 1 com estoque baixo, 1 cliente e R$ 30,00 de vendas (3000 centavos); a descrição foi editada; um cliente abrindo `/panel` recebeu 404. Testes locais: lint e testes unitários da API, do BFF e do web, incluindo os novos da loja.

## Limites

- Nenhuma página do painel foi aberta num navegador real: o visual e o layout em telas pequenas não foram vistos. As páginas de produto ficaram dentro de um contêiner com largura e margens duplas.
- Não há teste de integração no PostgreSQL que prove que um lojista não lê pedidos de outra loja; a garantia vem de a loja ser lida da sessão e dos testes unitários.
- Enviar e entregar só aparecem para pedidos pagos e enviados; cancelar pelo painel não foi acrescentado.
