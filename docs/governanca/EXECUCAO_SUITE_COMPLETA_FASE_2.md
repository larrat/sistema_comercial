# Execucao - Suite Completa da Fase 2

Data base: 2026-04-08  
Status: preparada para execucao  
Objetivo: executar em um unico comando a suite minima completa da Fase 2, cobrindo:

- Onda A / backend suite
- Onda B / UI core

## Artefato executavel

- [run-fase-2-suite.ps1](/e:/Programas/sistema_comercial/scripts/smoke/run-fase-2-suite.ps1)

## Ordem oficial do runner

1. backend suite
2. UI core

O runner para imediatamente na primeira falha.

## Variaveis obrigatorias

- `E2E_BASE_URL`
- `E2E_ADMIN_ACCESS_TOKEN`
- `E2E_MANAGER_ACCESS_TOKEN`
- `E2E_OPERATOR_ACCESS_TOKEN`
- `E2E_CAMPANHA_ID`
- `E2E_ALVO_USER_ID`
- `E2E_ALVO_FILIAL_ID`
- `E2E_LOGIN_EMAIL`
- `E2E_LOGIN_PASSWORD`
- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_KEY`

## Comando unico recomendado

```powershell
npm run test:e2e:fase-2
```

## Criterio de aprovado

- backend suite conclui sem falha
- UI core conclui sem falha
- nenhum runner usa fallback silencioso para mascarar erro

## Criterio de bloqueio

- qualquer fluxo backend retorna contrato invalido
- qualquer fluxo admin aceita papel indevido
- login, setup ou bootstrap falham na UI
- app entra em tela branca ou loading infinito no fluxo principal

## Referencias

- [EXECUCAO_BACKEND_SUITE_FASE_2.md](/e:/Programas/sistema_comercial/docs/governanca/EXECUCAO_BACKEND_SUITE_FASE_2.md)
- [EXECUCAO_UI_CORE_FASE_2.md](/e:/Programas/sistema_comercial/docs/governanca/EXECUCAO_UI_CORE_FASE_2.md)
- [CHECKLIST_EXECUCAO_FASE_2.md](/e:/Programas/sistema_comercial/docs/governanca/CHECKLIST_EXECUCAO_FASE_2.md)
