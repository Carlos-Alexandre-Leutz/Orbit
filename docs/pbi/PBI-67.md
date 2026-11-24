# PBI-67: Imagens e estoque

Issue: #396. Tarefas: #397, #398, #399, #400. Pull request: `pbi/68-69-storefront-payment` → `staging` (junto com os PBIs 66, 68 e 69). Decisões no [ADR-007](../adr/ADR-007-sign-up-flows-and-global-customer-account.md).

## Objetivo

Produtos com foto de verdade e um aviso claro de estoque baixo e esgotado.

## O que foi entregue

| Tarefa | Resultado |
|---|---|
| #397 Modelo e porta | Modelo `Image` (bytes no PostgreSQL), porta `ImageStorage` e o adaptador `DatabaseImageStorage`. `POST /uploads` (só lojista, o corpo é o arquivo) e `GET /images/:id` (público, cache longo). Produto ganhou `imageIds` (até 6, validados como da mesma loja). O BFF e o web repassam o arquivo e a imagem. |
| #398 Formulário e galeria | O formulário de produto tem o campo de fotos; a página do produto mostra a foto principal e as outras; o cartão do produto mostra a primeira foto (ou a inicial do nome). |
| #399 Estoque baixo e esgotado | "Only N left" para 5 unidades ou menos e "Out of stock" para 0 na vitrine; na tabela de produtos do painel, a coluna Stock fica amarela ("low") ou vermelha ("sold out"). |
| #400 Limites de tipo e tamanho | O tipo é lido pela assinatura do arquivo (PNG, JPEG ou WebP), nunca pelo que o navegador declara; arquivo vazio, acima de 2 MB ou de outro tipo (texto, GIF, SVG) é recusado com 400. Testado em `image-type.spec.ts`. |

## Validação

Feita em 2026-11-16 na stack do dono: um PNG foi enviado e lido de volta (200, `image/png`); um texto com tipo de imagem respondeu 400 "Only PNG, JPEG or WebP"; sem sessão, 401; a imagem atendida pelo site e pelo BFF; um produto recebeu a foto e a vitrine mostrou o cartão com ela e "Only 1 left".

## Limites

- O envio foi testado com um PNG de 1 pixel; o limite de 2 MB foi conferido pela regra pura e pela configuração dos dois leitores de corpo (Nest e Fastify), mas não com um arquivo de 2 MB real de ponta a ponta.
- As fotos ficam no banco; ver o ADR-007 para o limite de escala.
- Nenhuma foto é redimensionada: o navegador baixa o arquivo original.
- A página `/panel/products` não foi aberta com fotos no navegador.
