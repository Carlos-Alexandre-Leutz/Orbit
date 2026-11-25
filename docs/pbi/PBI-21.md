# PBI-21: Memória de curto prazo

Pull request: `pbi/21-short-term-memory` → `staging`. **Depende dos PRs #430 a #437** (a branch sai da do PBI-20).

## O que foi entregue

- **Conversas no MongoDB** (`conversations`, um documento por conversa), atrás da porta `ConversationStore` (adaptadores: MongoDB e memória do processo; sem `MONGO_URL` vale a memória, que um reinício esvazia). Conversas paradas expiram (`CONVERSATION_TTL_DAYS`, 30).
- **Isolamento por usuário:** toda leitura, escrita e remoção leva o `userId`; o id de outra pessoa se comporta como inexistente (404, `ConversationNotFoundError`). Um contrato de testes único roda contra a memória e contra um MongoDB de verdade.
- **Janela com resumo automático:** passando de 20 mensagens, as mais antigas viram um resumo escrito pelo modelo (`memory_summary`) e ficam as 8 últimas (`MEMORY_KEEP_MESSAGES`, `MEMORY_SUMMARIZE_ABOVE`). Se o resumo falhar, as mensagens ficam; passando de 60, as mais antigas saem com uma nota. O resumo vai ao agente como dado, entre `<conversation_summary>`, e o texto que alimenta o resumo vai entre tags, sem o fechamento forjado.
- **Chat com conversa:** `POST /chat/stream` aceita `conversationId` (de outra pessoa ou inexistente: 404 antes de abrir o fluxo) e devolve o id no primeiro evento `conversation`; o histórico do navegador deixou de existir. `GET /conversations`, `GET /conversations/:id` e `DELETE /conversations/:id` (e o BFF).
- **Apagar a conta apaga as conversas** (melhor esforço: uma falha não desfaz a exclusão).

## Critérios de aceite

| Critério | Prova |
|---|---|
| Conversas no MongoDB isoladas por `user_id` | `test/conversations.e2e-spec.ts` (contrato contra MongoDB real e memória) |
| Janela de mensagens com resumo automático | `conversation-memory.spec.ts` (resumo, mescla, falha, teto) |
| Testes de isolamento | `conversation-store.contract.ts` (ler, estender, compactar, apagar), `conversations.controller.spec.ts`, `conversation-memory.spec.ts` |

## Limites

- **A qualidade do resumo nunca foi medida com um modelo de verdade.**
- Sem `MONGO_URL` (hoje o QA do Render) a memória some a cada reinício e não vale entre instâncias.
- Um resumo é texto gerado de mensagens de usuário; ele entra no prompt como dado, mas é um caminho de injeção a testar no PBI-37.
- O teste de isolamento do MongoDB só roda onde há `MONGO_URL` (o CI tem um serviço Mongo; a máquina do dono, via contêiner).
- Não há limite de conversas por usuário.
