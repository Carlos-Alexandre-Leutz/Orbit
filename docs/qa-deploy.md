# Deploy do QA

**Última atualização: 2026-11-16.** Decisão e motivo: [ADR-006](adr/ADR-006-qa-auto-deploy.md). **Este gatilho não pode ser removido** (regra no `AGENTS.md`; o teste `tests/test_ci.py` falha se sumir).

## Como funciona

1. Um merge na `staging` dispara `.github/workflows/publish-images.yml`.
2. `publish` constrói as imagens `orbit-apps` (API e BFF) e `orbit-web` no GitHub e as publica no GHCR com a tag `latest`. O build fica no GitHub porque o plano grátis do Render estoura a memória construindo o Next.js.
3. `migrate` aplica as migrations no Neon (secret `NEON_DATABASE_URL`).
4. `redeploy` chama o deploy hook de cada serviço no Render, que baixa a imagem nova e reinicia.

## O que o dono precisa configurar (uma vez)

No Render, em cada serviço: **Settings → Deploy Hook** (copie a URL). No GitHub: **Settings → Secrets and variables → Actions → Secrets**.

| Secret do GitHub | Serviço no Render |
|---|---|
| `RENDER_QA_API_HOOK` | `orbit-qa-api` |
| `RENDER_QA_BFF_HOOK` | `orbit-qa-bff` |
| `RENDER_QA_WEB_HOOK` | `orbit-qa-web` |

Também já existem (não mudam): o secret `NEON_DATABASE_URL` e a variável `QA_BFF_URL`.

Se um secret faltar, o job mostra um aviso e o resumo diz qual serviço não foi atualizado. Se o Render recusar o hook, o job falha. Se você recriar um serviço no Render, o hook muda: troque o secret.

## O que não foi verificado

- O job foi escrito e testado só quanto à presença no workflow (`tests/test_ci.py`). **Nenhum deploy real foi disparado** antes do merge: depende de você criar os secrets.
- Presumo que o deploy hook de um serviço baseado em imagem baixa a imagem mais recente da tag configurada (`latest`). Isso vem da documentação do Render que eu conheço e deve ser conferido no primeiro merge: se o QA não atualizar, é o primeiro lugar a olhar.
