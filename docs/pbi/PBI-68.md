# PBI-68: Vitrine e página inicial da plataforma

Issue: #401. Tarefas: #402, #403, #404, #405. Pull request: `pbi/68-69-storefront-payment` → `staging` (junto com o PBI-69). Decisões no [ADR-007](../adr/ADR-007-sign-up-flows-and-global-customer-account.md).

## Objetivo

Fazer a loja e a plataforma parecerem uma loja virtual de verdade.

## O que foi entregue

| Tarefa | Resultado |
|---|---|
| #402 Vitrine | `/<slug>` tem um topo com capa (ou a cor da loja), logo, nome, slogan e descrição; categorias em "chips"; cartões com foto; rodapé com o contato da loja e "powered by Orbit". |
| #403 Produto e carrinho | A página do produto tem duas colunas (fotos e galeria à esquerda, preço, estoque e compra à direita). O carrinho tem as linhas com foto e um resumo do pedido ao lado, com o botão de checkout; a API do carrinho passou a devolver `imageId` da linha. |
| #404 Página inicial da plataforma | `/` virou uma página de apresentação ("Create your store", três passos, lojas existentes com capa, logo e slogan e um rodapé), no lugar da lista de lojas. |
| #405 Celular | A vitrine e o painel foram abertos com 375 px de largura; a página não rola para os lados. O menu do painel agora quebra de linha. |

## Validação

Feita em 2026-11-16 na stack do dono, no navegador da pasta do app: página inicial, vitrine (desktop e 375 px), painel (375 px), página de pagamento e página do pedido. As páginas de produto e de carrinho responderam 200 e foram conferidas pelo código, mas não vistas num navegador.

## Limites

- O carrinho, o checkout, o produto e a lista de pedidos não foram vistos no celular. O texto do cabeçalho em 375 px ocupa duas linhas.
- A capa e o logo de teste são um pixel esticado; o visual real depende das fotos que o lojista enviar.
- As cores de destaque vêm de regras CSS que trocam as classes azuis e verdes, então partes novas com outra cor não seguem a loja.
