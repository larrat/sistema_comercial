# Sistema Comercial

Aplicacao SPA browser-first com runtime modular no front, Edge Functions no Supabase e suite minima de smoke/E2E em evolucao.

## Estrutura principal

- `src/app/`
  Runtime principal da aplicacao (`main`, `api`, `store`, `local-config`).
- `src/shared/`
  Utilitarios, contexto, metricas e infraestrutura compartilhada do front.
- `src/features/`
  Modulos por dominio/tela e suporte de cotacao.
- `src/styles/`
  CSS principal da aplicacao.
- `docs/`
  Governanca, backend, arquitetura, design system e runbooks.
- `tests/`
  Specs E2E com Playwright.
- `scripts/`
  Smokes e runners operacionais.
- `sql/`
  Scripts de schema, RLS e RBAC.
- `supabase/`
  Edge Functions e recursos de infraestrutura Supabase.

## Comandos uteis

```powershell
npm run test:e2e:login
npm run test:e2e:setup-filial
npm run test:e2e:bootstrap-filial
npm run test:e2e:onda-b
npm run test:e2e:fase-2
```

## Observacoes

- `test-results/` e `node_modules/` sao artefatos gerados.
- A organizacao do repositorio foi consolidada em `docs/arquitetura/NOVA_ORGANIZACAO_REPOSITORIO_2026-04-08.md`.
