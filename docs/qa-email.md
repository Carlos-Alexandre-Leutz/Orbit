# E-mail no ambiente QA

**Última atualização: 2026-11-16.**

## O problema

No QA, "recuperar conta" mostrava "Error: User not found or server error." para qualquer erro. A API nunca diz que o e-mail não existe (devolve sempre a mesma mensagem). A causa **provável** é o SMTP do QA sem configuração: para um e-mail cadastrado, o envio falhava sem tratamento e a API respondia 500. Isso **não foi confirmado nos logs** do `orbit-qa-api` no Render.

## O que mudou

- **Provedor escolhido:** a API própria do dono, [`free-email-send-api`](https://github.com/Carlos-Alexandre-Leutz/free-email-send-api), por HTTP (`POST /v1/send`, token em `X-Api-Token`). Por quê: não precisa de servidor SMTP, funciona no Render grátis, e a conta do dono tem o limite do Gmail (400 por dia). O SMTP continua disponível (`MAIL_PROVIDER` ausente ou `smtp`).
- **API (`api-tasks`):** o envio fica atrás de uma porta (`MailTransport`) com dois adaptadores, SMTP e HTTP. Se o envio do e-mail de recuperação falhar, o erro vai para o log (`AuthService`) e a resposta continua a mensagem genérica, sem 500.
- **Tela `forgot-password`:** chama `/api/session/forgot-password` no próprio site (não mais o BFF direto pelo navegador) e mostra a mensagem que o servidor devolveu, ou "servidor inacessível".

## Limites conhecidos

- A API de e-mail só aceita **texto**: o link chega como texto, não como botão. O e-mail de confirmação de pedido também vai em texto pelo HTTP.
- O filtro de spam dela pode bloquear (422) e não foi testado com o link de reset.
- Falha de envio agora só aparece no log: o usuário vê "enviado" mesmo assim.
- Não rodei o envio real; só testes unitários.

## Variáveis no Render

Em `orbit-qa-api` (os valores são seus; não vão para o Git):

| Variável | Valor |
|---|---|
| `MAIL_PROVIDER` | `http` |
| `MAIL_API_URL` | `https://freeemailsenderapi.duckdns.org` |
| `MAIL_API_TOKEN` | o token da sua conta na API de e-mail (painel dela) |
| `APP_URL` | a URL pública do `orbit-qa-web` (o link do e-mail usa isto; sem ela abre `localhost`) |

`MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` e `MAIL_FROM` não são usados com `MAIL_PROVIDER=http`. Se `MAIL_PROVIDER=http` faltar `MAIL_API_URL` ou `MAIL_API_TOKEN`, a API **não sobe** e o log diz qual falta.

Depois de salvar, o Render reinicia o serviço. Teste: "recuperar conta" com um e-mail cadastrado e olhe a caixa de entrada (e o spam) e o log da API.
