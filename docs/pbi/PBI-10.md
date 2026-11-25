# PBI-10: Interface web

Pull request: `pbi/10-web-interface` → `staging`. **Revisado em 2026-11-25** (branch `feat/store-chat`): o chat deixou de ser uma página do Orbit e virou o assistente de cada loja.

## O que foi entregue

- **Assistente da loja** (componente `StoreChat`, `apps/web/components/StoreChat.tsx`): um botão redondo no canto inferior direito de toda página de `/<loja>/...` abre um chat sobre aquela loja (produtos, preços, estoque, frete, prazo de entrega, contato, destaques). Qualquer visitante usa, sem entrar na conta; ele não compra nada (para comprar, o carrinho). O botão usa a cor da loja e não aparece numa loja ainda em rascunho. O navegador chama `/api/bff/stores/<link>/chat`; a conversa fica só na página (as últimas 10 falas vão a cada pergunta) e o id do visitante, que só agrupa os limites, fica no `localStorage`.
- **Painel do lojista, Sales** (`/panel/sales`): receita, pedidos, unidades e ticket médio em 7, 30 ou 90 dias, receita por dia (barras, com os dias sem venda) e os cinco mais vendidos. API `GET /stores/mine/sales`.
- **Painel do lojista, Stock** (`/panel/stock`): produtos do menor para o maior estoque, com situação (esgotado, baixo, ok), vendas dos últimos 30 dias e uma estimativa de quantos dias o estoque dura nesse ritmo. API `GET /stores/mine/stock`.
- Palavras reservadas: `assistant`, `approvals`, `chat` e `conversations` continuam proibidas como link de loja.

**Removido em 2026-11-25** (o chat do Orbit, que a primeira versão deste PBI entregou): a página `/assistant`, o item "Assistant" do menu, a rota `/api/chat/stream`, o `ChatBox`, o `lib/chat.ts` e o cartão de aprovação dentro do chat. O cartão deixou de existir porque o assistente da loja não executa ações.

## Critérios de aceite

| Critério | Prova |
|---|---|
| Chat na loja | `lib/store-chat.test.ts` (histórico, resposta, limite, servidor fora do ar); **o componente não foi visto num navegador** |
| Páginas de vendas e estoque do lojista | `stores.reports.spec.ts` (somas, dias vazios, ranking, estimativa, limites), `lib/sales.test.ts`; as páginas não foram vistas num navegador |

## Limites

- **Nenhuma das telas novas foi aberta num navegador** nem passou por `next build` aqui (o CI roda o build). O layout no celular não foi visto.
- O botão do chat divide o canto com o botão "voltar ao topo", que subiu para `bottom-24`.
- O chat nunca falou com um modelo de verdade (sem `GEMINI_API_KEY`, em produção ele responde que o assistente não está disponível).
- O texto da resposta chega inteiro, não palavra a palavra.
- Vendas usam o dia em UTC e a moeda é a da loja (a tela formata em dólar, como o resto do painel).
- O `/conversations` (BFF e API) e a memória de conversas do PBI-21 ficaram sem uso na interface; a memória só é lida ao apagar a conta.
