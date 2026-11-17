# ADR-009: Área de administração do Orbit e o plano mensal do lojista

- **Status:** Proposed
- **Date:** 2026-11-16

## Context

O Orbit é uma plataforma: o lojista se cadastra e abre a loja ([ADR-007](ADR-007-sign-up-flows-and-global-customer-account.md)), recebe as vendas na própria conta de pagamento ([ADR-008](ADR-008-sellers-receive-their-own-payments.md)) e é o dono do Orbit quem cobra pelo uso da plataforma. O dono definiu em 2026-11-16: **um plano só, R$ 15 por mês, com tudo liberado**; mais planos virão depois. Ele precisa ver os clientes, acompanhar quem pagou e poder suspender uma loja.

O papel `ADMIN` já existia (rota `/users`, script `set-role`), mas não havia tela nem forma de registrar o plano.

## Decision

Construído, mas **nunca executado nem testado**.

- **Quem é admin:** só quem tem o papel `ADMIN`, que só se ganha pelo script `set-role` no servidor (não há cadastro público de admin). A conta de admin deve ser separada da conta de loja do dono.
- **Segurança:** a área fica num **endereço secreto**, a variável `ADMIN_PATH` do ambiente (nunca no código, na documentação nem no Git). Sem a variável as rotas da API e do BFF nem são registradas e as páginas respondem "não encontrado". O endereço esconde, mas não protege: toda rota da API usa `@Auth('ADMIN')`, e a área web confere o papel e devolve "não encontrado" a todos que não são admin, até a quem não fez login (mandar para o login revelaria que a área existe). O cabeçalho do site não tem link para ela. O admin **nunca vê** chaves de pagamento nem segredos de lojista.
- **O plano e o preço:** `Store.planId` (hoje só `pro`). O **preço fica no banco** (tabela `Plan`, começa em R$ 15,00 em BRL) e o admin o edita na página inicial da área do dono; cada mudança grava `SET_PRICE` em `AdminAction` (quem, de quanto para quanto). O preço novo vale para **assinaturas que começam depois**; as que já rodam no Mercado Pago mantêm o preço com que começaram (mudar o valor de uma assinatura existente exige atualizá-la no Mercado Pago, o que não foi feito), `Store.paidUntil` (até quando está pago) e a suspensão (`suspendedAt`, `suspendedReason`).
- **A cobrança é automática, com 30 dias grátis (decidido em 2026-11-16, escrito e nunca executado):** a conta do **próprio Orbit** no Mercado Pago cobra o plano todo mês (assinatura, `preapproval`). No painel (Billing) o lojista clica em "Start 30 free days" e vai à página do Mercado Pago, onde cadastra o cartão (o Orbit nunca vê o cartão). Os 30 dias grátis contam do cadastro do cartão; depois cobra R$ 15 por mês. A loja só pode ser **aberta ao público** (publicada) com a assinatura ativa ou com um pagamento registrado pelo admin; sem isso ela pode ser montada, mas fica rascunho.
- **Falha de cobrança:** o Mercado Pago tenta cobrar de novo por um tempo; se desistir, a assinatura vira `cancelled` ou `paused` e a loja é **suspensa sozinha** (motivo `billing: ...`). Quando a assinatura volta a `authorized`, essa suspensão é desfeita; uma suspensão feita pelo admin com outro motivo nunca é desfeita sozinha.
- **Pagamento manual continua:** o admin ainda pode registrar um pagamento recebido fora do Orbit, que também libera a loja.
- **Suspender:** a loja some da lista pública e da vitrine (quem não é admin vê "unavailable"), e o pagamento de novos pedidos é recusado (`STORE_SUSPENDED`). Nada é apagado, o estorno de pedidos já pagos continua funcionando, e o admin reativa quando quiser.
- **Trilha de auditoria:** toda ação do admin (registrar pagamento, suspender, reativar) grava uma linha em `AdminAction` (quem, qual loja, o quê, quando), na mesma transação da mudança. A linha não some se a loja for apagada.
- **O que o admin vê:** lista de lojas (dono, plano, pago até, estado, se tem provedor de pagamento, nº de pedidos), totais (lojas, pagantes, suspensas e quanto os pagantes somam por mês) e o detalhe de cada loja com o histórico.

## Alternatives considered

- **Stripe Billing para a assinatura.** É o mais maduro, mas o dono escolheu o Mercado Pago, que já é o provedor dele no Brasil.
- **Comissão por venda.** Com as chaves coladas pelo lojista, o Orbit não retém dinheiro, então não consegue cobrar comissão (ADR-008).
- **Só avisar o admin quando a cobrança falha.** Mais seguro contra erro, mas manual; o dono preferiu suspender sozinho.
- **Tabela `Plan` no banco.** Com um plano só, uma constante basta; a tabela entra quando houver mais de um plano ou preços editáveis.

## Consequences

- O dono passa a ver e controlar os clientes, e o histórico de cada ação fica registrado.
- **O Orbit precisa de uma conta Mercado Pago própria** com assinaturas e um endereço público para o webhook (`<BFF_PUBLIC_URL>/billing/webhook`). O código nunca rodou contra o Mercado Pago: o formato da assinatura de webhook, o campo `free_trial` e o `back_url` (que pode exigir https) são os pontos prováveis de ajuste. Em teste, o e-mail do pagador pode precisar ser de um usuário de teste.
- Uma loja só vira pública com a assinatura ativa: lojas que já estavam públicas continuam, mas não conseguem ser reabertas sem assinatura.
- **O admin é um alvo:** quem tomar uma conta de admin vê e suspende todas as lojas. Antes do primeiro cliente real, são necessários verificação em duas etapas, limite de tentativas de login e um endereço separado (ver `docs/open-questions.md`).
- Os limites do plano ("tudo liberado") ainda não existem no código: nada é limitado por plano.
- Este ADR vira "Accepted" depois de o código ser testado de verdade.
