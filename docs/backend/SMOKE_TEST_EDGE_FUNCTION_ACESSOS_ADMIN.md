# Smoke Test - Edge Function Acessos Admin

Data: 2026-04-08  
Status: pronto para execucao manual controlada

## Objetivo

Validar rapidamente o contrato da Edge Function `acessos-admin` sem depender da interface.

## Script

- [acessos-admin.ps1](/e:/Programas/sistema_comercial/scripts/smoke/acessos-admin.ps1)

## Parametros

- `BaseUrl`: URL base do projeto Supabase
- `AccessToken`: JWT do usuario autenticado
- `Action`: `perfil_upsert`, `perfil_delete`, `vinculo_upsert` ou `vinculo_delete`
- `AlvoUserId`: UUID do usuario alvo
- `AlvoFilialId`: obrigatorio nos fluxos de vinculo
- `Papel`: obrigatorio no `perfil_upsert`
- `ExpectedStatus`: status esperado

## Exemplo - sucesso perfil_upsert

```powershell
.\scripts\smoke\acessos-admin.ps1 `
  -BaseUrl "https://SEU-PROJETO.supabase.co" `
  -AccessToken "SEU_JWT_ADMIN" `
  -Action "perfil_upsert" `
  -AlvoUserId "00000000-0000-0000-0000-000000000000" `
  -Papel "gerente" `
  -ExpectedStatus 200
```

## Exemplo - sucesso vinculo_upsert

```powershell
.\scripts\smoke\acessos-admin.ps1 `
  -BaseUrl "https://SEU-PROJETO.supabase.co" `
  -AccessToken "SEU_JWT_ADMIN" `
  -Action "vinculo_upsert" `
  -AlvoUserId "00000000-0000-0000-0000-000000000000" `
  -AlvoFilialId "filial-1" `
  -ExpectedStatus 200
```

## Exemplo - token invalido

```powershell
.\scripts\smoke\acessos-admin.ps1 `
  -BaseUrl "https://SEU-PROJETO.supabase.co" `
  -AccessToken "TOKEN_INVALIDO" `
  -Action "perfil_delete" `
  -AlvoUserId "00000000-0000-0000-0000-000000000000" `
  -ExpectedStatus 401
```

## Exemplo - papel insuficiente

```powershell
.\scripts\smoke\acessos-admin.ps1 `
  -BaseUrl "https://SEU-PROJETO.supabase.co" `
  -AccessToken "JWT_NAO_ADMIN" `
  -Action "perfil_delete" `
  -AlvoUserId "00000000-0000-0000-0000-000000000000" `
  -ExpectedStatus 403
```

## O que o smoke valida

### Em sucesso `200`

- `ok = true`
- `data.action`
- `data.ator_user_id`
- `data.alvo_user_id`
- `data.alvo_filial_id`
- `data.recurso`
- `data.result`

### Em erro

- `error.code`
- `error.message`

## Recomendacao operacional

- executar primeiro com usuario `admin`
- preferir ambiente homologado antes de producao
- registrar evidencias no checklist da fase
- se a resposta vier `AUDIT_INSERT_FAILED`, validar o banco antes de repetir a chamada
