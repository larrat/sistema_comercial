# Fechamento Operacional - Fases 1 e 2

Data base: 2026-04-08  
Objetivo: encerrar operacionalmente as Fases 1 e 2 sem depender do bloqueio atual da automacao UI, usando como baseline obrigatoria a validacao de ambiente, deploy das Edge Functions, smoke backend e evidencias formais.

## Diretriz de encerramento

- **Fase 1 fecha** quando:
  - ambiente/RLS estiver validado
  - Edge Functions criticas estiverem publicadas
  - os 3 smokes backend estiverem aprovados
  - as evidencias estiverem registradas

- **Fase 2 fecha parcialmente com aceite operacional** quando:
  - contrato `SB.*` estiver aplicado nos fluxos criticos
  - a backend suite da Fase 2 estiver executavel e aprovada
  - a Onda B UI estiver preparada no repositorio
  - a pendencia de Playwright/browser estiver explicitamente registrada como bloqueio nao impeditivo para a trilha backend

## Ordem oficial de execucao

1. validar RLS/RBAC
2. publicar Edge Functions
3. executar smoke backend individual
4. executar backend suite da Fase 2
5. registrar evidencias
6. marcar checklist da Fase 1
7. marcar checklist da Fase 2

## Fase 1 - minimo operacional obrigatorio

### Bloco A - ambiente e RLS

Executar:

- `sql/02_rls_producao.sql`
- `sql/03_rbac_v1.sql`
- `sql/04_rbac_v2_admin_only.sql`
- `sql/05_rbac_auditoria_acessos.sql`
- `sql/05b_validacao_fase_1_rls_rbac.sql`

Registrar:

- resultado da validacao por role/tabela
- confirmacao de `politicas_anon_abertas = 0`
- evidencias em `docs/governanca/VALIDACAO_RLS_RBAC_FASE_1.md`

### Bloco B - Edge Functions

Publicar:

- `campanhas-gerar-fila`
- `acessos-admin`
- `acessos-admin-read`

Referencias:

- [RUNBOOK_DEPLOY_EDGE_FUNCTIONS_V1.md](/e:/Programas/sistema_comercial/docs/backend/RUNBOOK_DEPLOY_EDGE_FUNCTIONS_V1.md)
- [CHECKLIST_DEPLOY_EDGE_FUNCTIONS.md](/e:/Programas/sistema_comercial/docs/backend/CHECKLIST_DEPLOY_EDGE_FUNCTIONS.md)

### Bloco C - smokes obrigatorios

Executar:

- [campanhas-gerar-fila.ps1](/e:/Programas/sistema_comercial/scripts/smoke/campanhas-gerar-fila.ps1)
- [acessos-admin.ps1](/e:/Programas/sistema_comercial/scripts/smoke/acessos-admin.ps1)
- [acessos-admin-read.ps1](/e:/Programas/sistema_comercial/scripts/smoke/acessos-admin-read.ps1)

Minimo exigido:

- 1 caso `200` por funcao
- 1 caso negativo de autorizacao por funcao admin

### Bloco D - evidencia e saida

Preencher:

- [MODELO_EVIDENCIA_EXECUCAO_EDGE_FUNCTIONS.md](/e:/Programas/sistema_comercial/docs/backend/MODELO_EVIDENCIA_EXECUCAO_EDGE_FUNCTIONS.md)
- [CHECKLIST_EXECUCAO_FASE_1.md](/e:/Programas/sistema_comercial/docs/governanca/CHECKLIST_EXECUCAO_FASE_1.md)

## Fase 2 - baseline operacional sem UI obrigatoria

### O que conta como pronto agora

- `SB.toResult(...)` aplicado nos consumidores criticos
- Edge Functions integradas no frontend de campanhas e acessos
- backend suite da Fase 2 pronta e executavel
- documentacao da Onda B pronta, mesmo que a execucao Playwright esteja bloqueada

### O que executar

Executar no ambiente:

- [run-fase-2-backend-suite.ps1](/e:/Programas/sistema_comercial/scripts/smoke/run-fase-2-backend-suite.ps1)

Opcional, nao bloqueante neste momento:

- [run-fase-2-ui-core.ps1](/e:/Programas/sistema_comercial/scripts/smoke/run-fase-2-ui-core.ps1)
- `npm run test:e2e:onda-b`

### Regra de aceite da Fase 2 neste ciclo

- backend suite aprovada: **obrigatorio**
- Onda B UI documentada e preparada: **obrigatorio**
- Onda B UI executada com browser local: **desejavel, nao bloqueante**

### Evidencia minima da Fase 2

- output do runner backend
- lista dos fluxos criticos cobertos
- registro do bloqueio da trilha Playwright/browser, se persistir
- atualizacao de [CHECKLIST_EXECUCAO_FASE_2.md](/e:/Programas/sistema_comercial/docs/governanca/CHECKLIST_EXECUCAO_FASE_2.md)

## Criterio de bloqueio

Bloqueia Fase 1:

- qualquer funcao critica sem deploy
- qualquer smoke `200` com contrato quebrado
- qualquer smoke admin aceitando papel incorreto
- qualquer validacao RLS com `anon` aberto

Bloqueia Fase 2:

- contratos `SB.*` quebrados em fluxos criticos
- backend suite reprovada
- persistencia critica ainda mascarada em campanhas ou acessos

## Decisao recomendada

- Fechar Fase 1 apenas com deploy + smoke + evidencia
- Fechar Fase 2 operacionalmente pela trilha backend
- Manter a Onda B como frente preparada e em aberto ate destravar Playwright/browser
