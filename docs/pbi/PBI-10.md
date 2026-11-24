# PBI-10: Interface web

Pull request: `pbi/10-web-interface` → `staging`. **Depende dos PRs #430 a #438** (a branch sai da do PBI-21).

## O que foi entregue

- **Página do assistente** (`/assistant`, para quem compra: cliente e vendedor; o admin recebe "não encontrado"): conversa com resposta em stream. O navegador chama `/api/chat/stream`, que acrescenta o token da sessão e repassa os eventos do BFF sem guardá-los; o que o assistente está fazendo aparece ("Searching the catalog…") e a resposta entra quando chega. A conversa continua depois de recarregar (o id fica na sessão do navegador e o histórico vem de `/conversations`); "New chat" começa outra.
- **Cartão de aprovação no chat:** quando o assistente prepara uma compra ou um cancelamento, a mensagem traz o resumo e os botões Approve e Reject (`/approvals`); acima do limite de valor o cartão pede para digitar o total. O resultado da execução aparece no cartão.
- **Painel do lojista, Sales** (`/panel/sales`): receita, pedidos, unidades e ticket médio em 7, 30 ou 90 dias, receita por dia (barras, com os dias sem venda) e os cinco mais vendidos. API nova `GET /stores/mine/sales`.
- **Painel do lojista, Stock** (`/panel/stock`): produtos do menor para o maior estoque, com situação (esgotado, baixo, ok), vendas dos últimos 30 dias e uma estimativa de quantos dias o estoque dura nesse ritmo. API nova `GET /stores/mine/stock`.
- Palavras reservadas: `assistant`, `approvals`, `chat` e `conversations` não podem ser link de loja. O menu ganhou "Assistant" para quem compra.

## Critérios de aceite

| Critério | Prova |
|---|---|
| Página de chat com streaming | `lib/chat.test.ts` (leitura do fluxo em pedaços, estado da conversa, aprovação) e `chat.controller.spec.ts` do BFF; **a página não foi vista num navegador** |
| Páginas de vendas e estoque do lojista | `stores.reports.spec.ts` (somas, dias vazios, ranking, estimativa, limites), `lib/sales.test.ts`; as páginas não foram vistas num navegador |

## Limites

- **Nenhuma das telas novas foi aberta num navegador** nem passou por `next build` aqui (o CI roda o build). O tipo e o lint do web passam; o layout no celular não foi visto.
- O texto da resposta chega inteiro, não palavra a palavra: o provedor do modelo é chamado sem streaming de tokens.
- O chat nunca falou com um modelo de verdade, então o fluxo de ponta a ponta com respostas reais não foi exercido.
- Vendas usam o dia em UTC e a moeda é a da loja (a tela formata em dólar, como o resto do painel).
- Não há lista de conversas antigas na tela: só a atual e "New chat".
