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
  Índice, status atual, governança, backend, arquitetura, design system e runbooks.
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
npm run typecheck
npm run typecheck:strict
npm run test:e2e:login
npm run test:e2e:setup-filial
npm run test:e2e:bootstrap-filial
npm run test:e2e:onda-b
npm run test:e2e:fase-2
npm run test:e2e:fase-erp
```

## TypeScript gradual

- base permissiva: `tsconfig.json`
- trilha estrita: `tsconfig.strict.json`
- guia de adocao: `docs/arquitetura/TYPESCRIPT_GRADUAL.md`
- escopo atual da checagem: `src/` (front)

## Pilares ERP Recentes
- **Governança Tributária**: Motor de impostos centralizado (ICMS, PIS, COFINS, IBPT) com regras por NCM e UF.
- **RPA XML Automático**: Entrada híbrida de NFe, alimentando Kardex de estoque e gerando as Contas a Pagar no financeiro de forma transacional.
- **Integridade Transacional (Cancelamentos)**: Rotinas reforçadas com _Row Level Security (RLS)_ e sync bidirecional entre módulos de Vendas, Estoque e Recebíveis.

## Observacoes

- `test-results/` e `node_modules/` sao artefatos gerados.
- A entrada atual da documentação é `docs/README.md`.
- O snapshot mais recente do estado do sistema de arquitetura ERP é `docs/status/FASE_ERP_RELATORIO.md`.

