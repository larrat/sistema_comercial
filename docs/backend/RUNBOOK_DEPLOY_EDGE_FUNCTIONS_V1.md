# Runbook - Deploy de Edge Functions v1

Data: 2026-04-08  
Status: pronto para execucao em outra maquina  
Escopo: publicar e validar as funcoes:

- `campanhas-gerar-fila`
- `acessos-admin`
- `acessos-admin-read`

## Objetivo

Executar o deploy das Edge Functions com o menor nivel possivel de ambiguidade, registrar evidencias e sair com criterio claro de aprovado ou rollback.

## Quando usar

- depois de sincronizar este repositório em uma maquina com ambiente Supabase configurado
- quando for validar a frente de backend leve das campanhas e acessos
- quando for fechar os itens da Fase 1 relacionados a contrato e smokes

## Pre-requisitos obrigatorios

### Maquina

- `git`
- `supabase` CLI instalado e funcional
- PowerShell

Validacao rapida:

```powershell
git --version
supabase --version
```

### Acesso

- acesso ao projeto Supabase correto
- token ou sessao autenticada no CLI
- permissao para deploy de Edge Functions

### Repositorio

- branch correta atualizada
- arquivos presentes:
  - [campanhas-gerar-fila/index.ts](/e:/Programas/sistema_comercial/supabase/functions/campanhas-gerar-fila/index.ts)
  - [acessos-admin/index.ts](/e:/Programas/sistema_comercial/supabase/functions/acessos-admin/index.ts)
  - [acessos-admin-read/index.ts](/e:/Programas/sistema_comercial/supabase/functions/acessos-admin-read/index.ts)
  - [campanhas-gerar-fila.ps1](/e:/Programas/sistema_comercial/scripts/smoke/campanhas-gerar-fila.ps1)
  - [acessos-admin.ps1](/e:/Programas/sistema_comercial/scripts/smoke/acessos-admin.ps1)
  - [acessos-admin-read.ps1](/e:/Programas/sistema_comercial/scripts/smoke/acessos-admin-read.ps1)

## Ordem oficial de execucao

1. atualizar repositorio
2. autenticar e vincular projeto Supabase
3. publicar `campanhas-gerar-fila`
4. publicar `acessos-admin`
5. publicar `acessos-admin-read`
6. executar smoke de campanhas
7. executar smoke de acessos escrita
8. executar smoke de acessos leitura
9. registrar evidencias no checklist da fase

## Passo 1 - Atualizar repositorio

```powershell
git pull
git status --short
```

Esperado:

- branch atualizada
- sem conflito local impedindo deploy

## Passo 2 - Autenticar no Supabase CLI

### Login

```powershell
supabase login
```

### Vincular o projeto

Se houver `project-ref` conhecido:

```powershell
supabase link --project-ref SEU_PROJECT_REF
```

Se ja estiver vinculado, validar:

```powershell
supabase projects list
```

## Passo 3 - Publicar a function `campanhas-gerar-fila`

```powershell
supabase functions deploy campanhas-gerar-fila
```

Esperado:

- deploy concluido sem erro

## Passo 4 - Publicar a function `acessos-admin`

```powershell
supabase functions deploy acessos-admin
```

## Passo 5 - Publicar a function `acessos-admin-read`

```powershell
supabase functions deploy acessos-admin-read
```

## Passo 6 - Preparar variaveis para smoke

Voce vai precisar de:

- `BaseUrl`
- `AccessToken`
- `CampanhaId`
- `AlvoUserId`
- `AlvoFilialId`

### BaseUrl

Formato:

```text
https://SEU-PROJETO.supabase.co
```

### AccessToken

Use um JWT valido do usuario certo para cada caso:

- `admin` para smoke de sucesso em acessos
- `gerente` ou `admin` para smoke de sucesso em campanhas
- `operador` para smoke de erro `403` quando quiser validar autorizacao

## Passo 7 - Rodar smoke de campanhas

Referencia:

- [SMOKE_TEST_EDGE_FUNCTION_CAMPANHAS.md](/e:/Programas/sistema_comercial/docs/backend/SMOKE_TEST_EDGE_FUNCTION_CAMPANHAS.md)

Exemplo:

```powershell
.\scripts\smoke\campanhas-gerar-fila.ps1 `
  -BaseUrl "https://SEU-PROJETO.supabase.co" `
  -AccessToken "SEU_JWT_GERENTE_OU_ADMIN" `
  -CampanhaId "cmp_123" `
  -DryRun `
  -ExpectedStatus 200
```

## Passo 8 - Rodar smoke de acessos escrita

Referencia:

- [SMOKE_TEST_EDGE_FUNCTION_ACESSOS_ADMIN.md](/e:/Programas/sistema_comercial/docs/backend/SMOKE_TEST_EDGE_FUNCTION_ACESSOS_ADMIN.md)

Exemplo:

```powershell
.\scripts\smoke\acessos-admin.ps1 `
  -BaseUrl "https://SEU-PROJETO.supabase.co" `
  -AccessToken "SEU_JWT_ADMIN" `
  -Action "perfil_upsert" `
  -AlvoUserId "00000000-0000-0000-0000-000000000000" `
  -Papel "gerente" `
  -ExpectedStatus 200
```

Exemplo de validacao de permissao:

```powershell
.\scripts\smoke\acessos-admin.ps1 `
  -BaseUrl "https://SEU-PROJETO.supabase.co" `
  -AccessToken "JWT_NAO_ADMIN" `
  -Action "perfil_delete" `
  -AlvoUserId "00000000-0000-0000-0000-000000000000" `
  -ExpectedStatus 403
```

## Passo 9 - Rodar smoke de acessos leitura

Referencia:

- [SMOKE_TEST_EDGE_FUNCTION_ACESSOS_ADMIN_READ.md](/e:/Programas/sistema_comercial/docs/backend/SMOKE_TEST_EDGE_FUNCTION_ACESSOS_ADMIN_READ.md)

Exemplo:

```powershell
.\scripts\smoke\acessos-admin-read.ps1 `
  -BaseUrl "https://SEU-PROJETO.supabase.co" `
  -AccessToken "SEU_JWT_ADMIN" `
  -AuditoriaLimit 100 `
  -ExpectedStatus 200
```

Exemplo de validacao de permissao:

```powershell
.\scripts\smoke\acessos-admin-read.ps1 `
  -BaseUrl "https://SEU-PROJETO.supabase.co" `
  -AccessToken "JWT_NAO_ADMIN" `
  -ExpectedStatus 403
```

## Passo 10 - Registrar evidencias

Registrar no minimo:

- data e hora da execucao
- nome do ambiente
- commit ou branch usada
- output do deploy das 3 funcoes
- output do smoke `200`
- output do smoke `403` ou `401`
- papel usado em cada teste

Atualizar:

- [CHECKLIST_EXECUCAO_FASE_1.md](/e:/Programas/sistema_comercial/docs/governanca/CHECKLIST_EXECUCAO_FASE_1.md)

## Criterio de aprovado

- 3 functions publicadas sem erro
- smoke de campanhas com contrato `200` validado
- smoke de acessos-admin com contrato `200` validado
- smoke de acessos-admin-read com contrato `200` validado
- pelo menos 1 caso negativo de autorizacao validado
- evidencias registradas

## Criterio de bloqueio

Interromper a execucao se houver:

- erro de login/link no Supabase CLI
- deploy falhando em qualquer function
- smoke `200` retornando contrato incompleto
- smoke de acessos permitindo `operador`
- erro `AUDIT_INSERT_FAILED` na function de acessos sem validacao manual do banco

## Rollback operacional

### Se o deploy falhar

- nao prosseguir para os smokes
- registrar erro e encerrar a execucao

### Se o smoke de campanhas falhar

- manter frontend antigo em observacao
- nao homologar backend de campanhas como concluido

### Se o smoke de acessos falhar

- nao homologar a frente de acessos
- manter investigacao em:
  - RBAC
  - RLS
  - `acessos_auditoria`

## Observacoes importantes

- este runbook nao substitui validacao de RLS/RBAC do banco
- usar preferencialmente homologacao antes de producao
- se o host nao tiver `supabase` CLI, este runbook nao pode ser executado integralmente
- neste caso, a execucao deve migrar para a outra maquina preparada

## Ponto de parada

Se voce concluir:

- deploy das 3 functions
- smoke `200` das 3 functions
- um smoke negativo de autorizacao

entao a frente de Edge Functions v1 pode ser considerada operacionalmente validada para a Fase 1/2 de transicao
