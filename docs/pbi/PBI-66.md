# PBI-66: Aparência da loja

Issue: #391. Tarefas: #392, #393, #394, #395. Pull request: `pbi/66-67-store-look` → `staging` (junto com o PBI-67). Decisões no [ADR-007](../adr/ADR-007-sign-up-flows-and-global-customer-account.md).

## Objetivo

O lojista dá a cara da própria loja: logo, capa, cor, slogan e contato.

## O que foi entregue

| Tarefa | Resultado |
|---|---|
| #392 Campos da loja | A loja ganhou `tagline`, `primaryColor` (padrão `#2563eb`), `logoImageId`, `coverImageId`, `contactEmail` e `contactPhone`. A API da loja pública e `GET /stores/mine` devolvem esses campos; o dono nunca. |
| #393 Página de configurações | `/panel/settings` edita tudo isso, com seletor de cor e envio de logo e capa. |
| #394 Aparência na vitrine | O layout da loja põe a cor como variável CSS; botões e links da vitrine e das telas de login da loja usam essa cor. O cabeçalho mostra o logo e o nome da loja em vez de "Orbit". A capa só é mostrada na vitrine redesenhada do PBI-68. |
| #395 Testes de validação | A API recusa cor fora de `#rrggbb` e e-mail inválido, e recusa uma imagem que não é da loja. O web só aplica cores `#rrggbb` (qualquer outra cai no padrão) e escolhe texto preto ou branco pela luminância; testado em `lib/images.test.ts`. |

## Validação

Feita em 2026-11-16 na stack do dono (migração aplicada no PostgreSQL do contêiner): o lojista de teste salvou slogan, cor `#16A34A` (guardada em minúsculas), logo, capa e e-mail pela API; cor `red` respondeu 400 com mensagem; um id de imagem aleatório respondeu 400; a loja pública devolveu os campos novos; no navegador da pasta do app, a vitrine e o login da loja saíram verdes, com o logo no cabeçalho, e `/panel/settings` abriu preenchido.

## Limites

- A capa ainda não aparece em lugar nenhum da vitrine (vem no PBI-68). O contato também só é exibido no rodapé da vitrine nova do PBI-68.
- A cor é aplicada por regras CSS que sobrescrevem as classes azuis e verdes da vitrine, não por um tema completo. Um componente novo com outra cor não é afetado.
- Foi preciso alterar o `globals.css` duas vezes para o servidor de desenvolvimento recompilar o CSS; num ambiente igual ao do dono, isso pode se repetir.
