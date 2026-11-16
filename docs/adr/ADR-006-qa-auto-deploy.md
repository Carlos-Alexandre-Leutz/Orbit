# ADR-006: Deploy automático do QA: build no GitHub e gatilho no Render

- **Status:** Accepted
- **Date:** 2026-11-16

## Context

O QA roda em três serviços grátis do Render (`orbit-qa-api`, `orbit-qa-bff`, `orbit-qa-web`) com banco no Neon. O plano grátis do Render tem 512 MB de memória, e o build do Next.js estoura essa memória. Por isso as imagens são construídas no GitHub e o Render só as baixa. O Render **não observa o GHCR**: sem um aviso, ele continua rodando a imagem antiga depois de cada merge.

Um gatilho assim existia no template (`deploy.yml` chamava um deploy hook do Render) e foi removido na PBI-05, em 13 e 14/nov, porque falhava por falta de secrets. Depois disso, cada merge na `staging` deixou o QA desatualizado até alguém redeployar à mão. Isso só foi notado em 2026-11-16, no merge do PBI-63.

## Decision

- O build das imagens roda no GitHub (`publish-images.yml`), em todo push na `staging`.
- O job `redeploy` do mesmo workflow roda **depois** da publicação e das migrations (`needs: migrate`) e chama o deploy hook de cada serviço do QA (`RENDER_QA_API_HOOK`, `RENDER_QA_BFF_HOOK`, `RENDER_QA_WEB_HOOK`, secrets do repositório que o dono cria).
- Um secret ausente gera um aviso e o resumo do job diz qual serviço não foi atualizado; um hook que o Render recusa faz o job falhar.
- **Esse gatilho não é removido nem enfraquecido.** Se o workflow falhar, a correção é consertar (criar o secret, corrigir o passo), não apagar. Mudar o gatilho exige um "sim" explícito do dono. O `tests/test_ci.py` falha se o job `redeploy` sumir, e a regra está no `AGENTS.md`.

## Alternatives considered

- **Deixar o Render construir a imagem a partir do repositório:** estoura a memória do plano grátis (motivo de tudo isto).
- **Redeploy manual no painel do Render:** é o que acontecia sem gatilho. Esquecível, e o QA fica com código velho sem ninguém notar.
- **Pagar um plano maior do Render:** resolveria o build, mas não o aviso de que há imagem nova.
- **Um novo `deploy.yml` separado:** os dois workflows disputariam a ordem (o redeploy tem que esperar a publicação e as migrations); no mesmo arquivo isso é uma linha (`needs`).

## Consequences

- Todo merge na `staging` atualiza o QA sozinho, desde que os três secrets existam.
- O dono precisa criar três deploy hooks no Render e três secrets no GitHub, e refazer o hook se o serviço for recriado.
- Um deploy hook é uma URL secreta: quem a tem consegue redeployar o serviço. Por isso ele fica só em secrets e nunca no repositório nem em logs.
- Quando o deploy de produção existir (PBI-42 e PBI-43), ele terá o próprio gatilho; este ADR cobre só o QA.
