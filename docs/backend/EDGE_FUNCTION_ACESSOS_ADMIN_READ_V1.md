# Edge Function - Acessos Admin Read v1

Data: 2026-04-08  
Status: desenho inicial implementado no repositório

## Objetivo

Agregar em um unico endpoint as leituras administrativas usadas na tela de acessos:

- perfis RBAC
- vinculos usuario x filial
- filiais
- auditoria administrativa

## Endpoint

`GET /functions/v1/acessos-admin-read`

Query params opcionais:

- `auditoria_limit`: limite de linhas da auditoria

Exemplo:

`GET /functions/v1/acessos-admin-read?auditoria_limit=100`

## Autenticacao

- exige `Authorization: Bearer <jwt>`
- valida sessao autenticada
- valida papel `admin`

## Contrato de sucesso

```json
{
  "ok": true,
  "data": {
    "ator_user_id": "11111111-1111-1111-1111-111111111111",
    "papel": "admin",
    "perfis": [],
    "vinculos": [],
    "filiais": [],
    "auditoria": [],
    "auditoria_limit": 100
  }
}
```

## Contrato de erro

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Somente admin pode consultar a leitura administrativa agregada."
  }
}
```

Codigos previstos:

- `AUTH_MISSING`
- `AUTH_INVALID`
- `FORBIDDEN`
- `ROLE_FETCH_FAILED`
- `ACCESS_READ_FAILED`

## Decisoes de arquitetura

- leitura agregada e separada da function de escrita
- leitura continua sujeita ao JWT do proprio usuario
- o endpoint reduz round-trips do frontend para a tela administrativa
- o frontend pode passar a depender de um contrato unico para montagem da tela

## O que ela prepara

1. migracao de [filiais-acessos.js](/e:/Programas/sistema_comercial/src/features/filiais-acessos.js) para um unico `SB.getAcessosAdminReadEdge()`
2. smoke test unico da leitura administrativa
3. melhor base para paginacao ou filtros server-side no `v2`

## Limitacoes do v1

- ainda nao faz filtros server-side por papel ou filial
- ainda nao pagina perfis/vinculos
- a auditoria tem apenas `limit`

## Proximo passo recomendado

1. adicionar helper em [api.js](/e:/Programas/sistema_comercial/src/app/api.js)
2. adaptar [filiais-acessos.js](/e:/Programas/sistema_comercial/src/features/filiais-acessos.js) para usar a leitura agregada
3. executar o smoke test descrito em [SMOKE_TEST_EDGE_FUNCTION_ACESSOS_ADMIN_READ.md](/e:/Programas/sistema_comercial/docs/backend/SMOKE_TEST_EDGE_FUNCTION_ACESSOS_ADMIN_READ.md)
