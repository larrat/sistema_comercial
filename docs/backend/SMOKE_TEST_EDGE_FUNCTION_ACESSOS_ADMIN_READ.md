# Smoke Test - Edge Function Acessos Admin Read

Data: 2026-04-08  
Status: pronto para execucao manual controlada

## Objetivo

Validar rapidamente o contrato da Edge Function `acessos-admin-read` sem depender da interface.

## Script

- [acessos-admin-read.ps1](/e:/Programas/sistema_comercial/scripts/smoke/acessos-admin-read.ps1)

## Parametros

- `BaseUrl`: URL base do projeto Supabase
- `AccessToken`: JWT do usuario autenticado
- `AuditoriaLimit`: quantidade maxima de linhas da auditoria
- `ExpectedStatus`: status esperado

## Exemplo - sucesso

```powershell
.\scripts\smoke\acessos-admin-read.ps1 `
  -BaseUrl "https://SEU-PROJETO.supabase.co" `
  -AccessToken "SEU_JWT_ADMIN" `
  -AuditoriaLimit 100 `
  -ExpectedStatus 200
```

## Exemplo - token invalido

```powershell
.\scripts\smoke\acessos-admin-read.ps1 `
  -BaseUrl "https://SEU-PROJETO.supabase.co" `
  -AccessToken "TOKEN_INVALIDO" `
  -ExpectedStatus 401
```

## Exemplo - papel insuficiente

```powershell
.\scripts\smoke\acessos-admin-read.ps1 `
  -BaseUrl "https://SEU-PROJETO.supabase.co" `
  -AccessToken "JWT_NAO_ADMIN" `
  -ExpectedStatus 403
```

## O que o smoke valida

### Em sucesso `200`

- `ok = true`
- `data.ator_user_id`
- `data.papel`
- `data.perfis`
- `data.vinculos`
- `data.filiais`
- `data.auditoria`
- `data.auditoria_limit`

### Em erro

- `error.code`
- `error.message`

## Recomendacao operacional

- executar primeiro com usuario `admin`
- preferir ambiente homologado antes de producao
- registrar evidencias no checklist da fase
