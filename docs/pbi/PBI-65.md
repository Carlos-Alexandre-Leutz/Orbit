# PBI-65: Fluxos de cadastro

Issue: #380. Tarefas: #381, #382, #383, #384. Pull request: `pbi/65-sign-up-flows` → `staging`. Decisões no [ADR-007](../adr/ADR-007-sign-up-flows-and-global-customer-account.md).

## Objetivo

Deixar claro quem é lojista e quem é cliente: o lojista cria a conta na plataforma e o cliente cria a conta dentro da loja.

## O que foi entregue

| Tarefa | Resultado |
|---|---|
| #381 Página `/sell` | O lojista se cadastra em `/sell` (nome, e-mail, senha, nome e link da loja) e cai em `/seller/products`. A caixinha "I want to sell" saiu. `/register` redireciona para `/sell`. |
| #382 Cliente dentro da loja | `/<slug>/register` e `/<slug>/login`, com o nome da loja e a frase de que a conta vale em todas as lojas. O cliente volta para a página de onde veio. O proxy e `requireCustomer` mandam o visitante de uma loja para o login dela. |
| #383 Um papel por e-mail | O e-mail já era único; a mensagem de conflito agora está em inglês e explica que um e-mail é de cliente ou de lojista. A página `/sell` avisa o mesmo. |
| #384 Links reservados e menu | `sell` e `account` (e `panel` no web) reservados na API e no web. O cabeçalho de uma loja mostra "Sign in" e "Sign up" da loja; fora de uma loja mostra "Create your store". |

## Validação

Feita em 2026-11-16 na stack do dono, em modo de desenvolvimento (o código montado recarrega sozinho): `/sell` 200; `/register` 307 para `/sell`; `/demo-store/login` e `/demo-store/register` 200; `/demo-store/cart` sem sessão 307 para `/demo-store/login?next=...`; cadastro de lojista e de cliente pela rota `/api/session/register` funcionou; o mesmo e-mail como lojista depois de cliente deu 409 com a mensagem nova; a loja com o link `sell` deu 400 (reservado). Testes locais: lint e testes unitários da API (260) e do web (67). O build da API não rodou localmente (a pasta `dist` pertence ao root por causa do contêiner), então fica para o CI.

## Limites

Os formulários não foram abertos num navegador real; só as páginas e as chamadas foram conferidas. O cadastro de cliente ainda não guarda em qual loja ele entrou (PBI-70).
