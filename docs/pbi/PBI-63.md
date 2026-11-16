# PBI-63: Envio de e-mail no ambiente QA

Issue: #365. Tarefas: #366, #367, #368. Pull request: [#364](https://github.com/Carlos-Alexandre-Leutz/Orbit/pull/364), `feat/mail-http-transport` → `staging`.

## Objetivo

Fazer a recuperação de senha funcionar no QA: o envio de e-mail falhava (SMTP sem configuração), a API respondia 500 e a tela mostrava um erro que não dizia a causa.

## O que foi entregue

| Tarefa | Resultado |
|---|---|
| #366 Transporte de e-mail | O envio fica atrás da porta `MailTransport`, com dois adaptadores: SMTP e HTTP (a `free-email-send-api` do dono, `POST /v1/send`). `MAIL_PROVIDER=http` escolhe o HTTP; sem a variável continua SMTP. Com `http` e sem `MAIL_API_URL` ou `MAIL_API_TOKEN`, a API não sobe. |
| #367 Telas e resposta da API | Se o envio falhar, a API registra no log e responde 503 (antes 500). As telas `forgot-password` e `reset-password` chamam `/api/session/*` no próprio site, e não o BFF pelo navegador (a variável `NEXT_PUBLIC_BFF_URL` não existe no build, e a tela de redefinição quebrava com "Unexpected token '<'"). |
| #368 Registro | `AGENTS.md`, `.env.example`, `docs/qa-email.md` e `docs/open-questions.md`. |

## Validação

| Critério | Resultado | Evidência |
|---|---|---|
| O e-mail de recuperação sai pelo adaptador HTTP | **Passou** | Envio real para o e-mail do dono, aceito pela API de e-mail; o dono relatou no chat que recebeu. |
| Falha de envio não vira 500 | **Passou** | Teste unitário do `AuthService` e `curl` na rota do web: 503 com a mensagem. |
| A tela de redefinição troca a senha | **Parcial** | Rota nova respondeu 400 em JSON para token falso. A troca com token válido pela tela foi relatada como funcionando pelo dono no chat; não gravei a evidência. |
| `scripts/dev test` | **Passou** | Lint, testes e build de `api-tasks` e `web`. |

## Limites e o que não foi verificado

- Nada foi testado no Render: as variáveis `MAIL_PROVIDER`, `MAIL_API_URL`, `MAIL_API_TOKEN` e `APP_URL` precisam ser preenchidas pelo dono (lista em `docs/qa-email.md`).
- A API de e-mail só aceita texto: o link chega como texto e o e-mail de pedido perde a tabela. O filtro de spam dela pode bloquear links em outros textos.
- O 503 só acontece para conta existente, então revela que ela existe quando o e-mail está quebrado (escolha para o QA mostrar o erro real).
- No computador do dono os contêineres não tinham saída para a internet e nem rede entre si (`bridge-nf-call-iptables`); isso é do ambiente dele, não do projeto. O teste foi feito com a API, o BFF e o web fora do Docker.
