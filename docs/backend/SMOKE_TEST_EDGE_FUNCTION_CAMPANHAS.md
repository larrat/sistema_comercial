# Smoke Test - Edge Function Campanhas Gerar Fila

Data base: 2026-04-08  
Objetivo: validar rapidamente o contrato HTTP da Edge Function `campanhas-gerar-fila`.

## Artefato executavel
- [campanhas-gerar-fila.ps1](/e:/Programas/sistema_comercial/scripts/smoke/campanhas-gerar-fila.ps1)

## Pre-requisitos
- Edge Function publicada no ambiente Supabase
- `campanha_id` valido e acessivel pelo usuario
- `access_token` valido do usuario autenticado
- PowerShell com `Invoke-WebRequest`

## Caso 1 - sucesso com `dry_run`
Esperado:
- status `200`
- `ok = true`
- objeto `data` com:
  - `campanha_id`
  - `filial_id`
  - `dry_run`
  - `criados`
  - `ignorados`
  - `falhas`
  - `total_elegiveis`

Exemplo:
```powershell
.\scripts\smoke\campanhas-gerar-fila.ps1 `
  -BaseUrl "https://SEU-PROJETO.supabase.co" `
  -AccessToken "SEU_JWT" `
  -CampanhaId "cmp_123" `
  -DryRun `
  -ExpectedStatus 200
```

## Caso 2 - erro por token ausente/invalido
Esperado:
- status `401`
- objeto `error`
- `error.code`
- `error.message`

Exemplo:
```powershell
.\scripts\smoke\campanhas-gerar-fila.ps1 `
  -BaseUrl "https://SEU-PROJETO.supabase.co" `
  -AccessToken "token_invalido" `
  -CampanhaId "cmp_123" `
  -ExpectedStatus 401
```

## Caso 3 - erro de permissao
Esperado:
- status `403`
- `error.code = FORBIDDEN`

Observacao:
- execute com usuario `operador`

## Caso 4 - campanha inexistente
Esperado:
- status `404`
- `error.code = CAMPANHA_NOT_FOUND`

## Evidencias minimas
- output do caso `200`
- output do caso `401` ou `403`
- data da execucao
- ambiente alvo
- usuario/role usado no teste

## Criterio de aprovado
- contrato de sucesso validado
- contrato de erro validado
- campos obrigatorios presentes
- sem resposta HTML ou erro opaco no corpo
