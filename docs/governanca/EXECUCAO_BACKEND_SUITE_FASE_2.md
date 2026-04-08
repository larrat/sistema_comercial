# Execucao - Backend Suite da Fase 2

Data base: 2026-04-08  
Status: em andamento  
Objetivo: executar em um unico comando a primeira onda da smoke suite minima da Fase 2, cobrindo os 3 fluxos backend:

- campanhas / gerar fila
- acessos admin / escrita
- acessos admin / leitura

## Artefato executavel

- [run-fase-2-backend-suite.ps1](/e:/Programas/sistema_comercial/scripts/smoke/run-fase-2-backend-suite.ps1)

## O que a suite executa

1. `campanhas-gerar-fila` com `200`
2. `campanhas-gerar-fila` com `403`
3. `acessos-admin` `perfil_upsert` com `200`
4. `acessos-admin` `vinculo_upsert` com `200`
5. `acessos-admin` com `403`
6. `acessos-admin-read` com `200`
7. `acessos-admin-read` com `403`

## Pre-requisitos

- Edge Functions publicadas
- `BaseUrl` valido
- JWT `admin`
- JWT `gerente`
- JWT `operador`
- `campanha_id` valido
- `alvo_user_id` valido
- `alvo_filial_id` valido

## Comando unico

```powershell
.\scripts\smoke\run-fase-2-backend-suite.ps1 `
  -BaseUrl "https://SEU-PROJETO.supabase.co" `
  -AdminAccessToken "JWT_ADMIN" `
  -ManagerAccessToken "JWT_GERENTE" `
  -OperatorAccessToken "JWT_OPERADOR" `
  -CampanhaId "cmp_123" `
  -AlvoUserId "00000000-0000-0000-0000-000000000000" `
  -AlvoFilialId "filial-1"
```

## Criterio de aprovado

- todos os passos retornam sucesso no runner
- casos `200` validam contrato
- casos `403` bloqueiam papel incorreto

## Criterio de bloqueio

- qualquer passo falha
- contrato incompleto em qualquer resposta `200`
- qualquer fluxo admin aceita `operador`

## Referencias

- [FLUXOS_CRITICOS_SMOKE_SUITE_FASE_2.md](/e:/Programas/sistema_comercial/docs/governanca/FLUXOS_CRITICOS_SMOKE_SUITE_FASE_2.md)
- [ROTEIRO_AUTOMACAO_INCREMENTAL_FASE_2.md](/e:/Programas/sistema_comercial/docs/governanca/ROTEIRO_AUTOMACAO_INCREMENTAL_FASE_2.md)
- [CHECKLIST_EXECUCAO_FASE_2.md](/e:/Programas/sistema_comercial/docs/governanca/CHECKLIST_EXECUCAO_FASE_2.md)
