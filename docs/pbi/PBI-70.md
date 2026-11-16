# PBI-70: Conta global do cliente

Issue: #385. Tarefas: #386, #387, #388, #389, #390. Pull request: `pbi/70-global-customer-account` → `staging`. Decisões no [ADR-007](../adr/ADR-007-sign-up-flows-and-global-customer-account.md).

## Objetivo

Uma conta de cliente que vale em todas as lojas, sem que um lojista veja o que o cliente fez nas outras.

## O que foi entregue

| Tarefa | Resultado |
|---|---|
| #386 Ligação cliente × loja | Modelo `StoreCustomer` (migração com carga dos clientes que já tinham pedido). O cliente entra na loja ao se cadastrar nela (`joinStore`) e ao fazer o primeiro pedido. |
| #387 Isolamento do lojista | `GET /store-customers` (só lojista): a loja vem da sessão, nunca da requisição; só nome, e-mail, data de entrada, consentimento, número de pedidos e total gasto **naquela loja**. Testes unitários conferem a loja usada nas duas consultas e os campos devolvidos. |
| #388 Página `/account` | Pedidos de todas as lojas agrupados por loja, com link para cada pedido, e item "My account" no menu do cliente. |
| #389 Consentimento por loja | Caixa opcional no cadastro; `PATCH /account/stores/:slug` liga e desliga o consentimento de uma loja sem tocar nas outras; alternância na página `/account`. |
| #390 Apagar a conta | `DELETE /account`: os pedidos ficam, mas sem o nome; o e-mail vira um valor sem dono, a senha fica inutilizável, e os carrinhos e as ligações com as lojas são removidos. A conta não entra mais. |

## Validação

Feita em 2026-11-16 na stack do dono (migração aplicada no PostgreSQL do contêiner, serviços recarregados sozinhos): cadastro de cliente com `joinStore` e consentimento; `/account` com 200; `GET /account/stores` devolveu a loja com o consentimento; o consentimento foi desligado só para essa loja; um lojista recebeu 403 em `/account/stores` e `[]` em `/store-customers` da própria loja; apagar a conta respondeu ok e o login seguinte deu 401. Testes locais: lint e testes unitários da API, do BFF e do web, todos verdes.

## Limites

- Os testes de isolamento são unitários (com o Prisma simulado); não há teste de integração no PostgreSQL com duas lojas. A verificação do lojista de outra loja foi feita só com o lojista novo, que não tem clientes.
- Nenhuma página lista os clientes para o lojista ainda: a API existe e a página entra no painel (PBI-61).
- A página `/account` e o botão de apagar não foram abertos num navegador real; o fluxo foi exercitado pelas rotas.
- Um token de sessão já emitido continua válido até expirar depois de apagar a conta; a guarda de rota não consulta o banco.
