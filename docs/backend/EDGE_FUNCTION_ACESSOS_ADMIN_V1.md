# Edge Function - Acessos Admin v1

Data: 2026-04-08  
Status: Desenho inicial implementado no repositório

## Objetivo

Tirar do browser as operacoes administrativas mais sensiveis de RBAC:

- salvar perfil de acesso
- remover perfil de acesso
- vincular usuario a filial
- desvincular usuario de filial

## Endpoint

`POST /functions/v1/acessos-admin`

## Autenticacao

- exige `Authorization: Bearer <jwt>`
- valida sessao autenticada
- valida papel `admin`

## Contrato de entrada

### Perfil - upsert

```json
{
  "action": "perfil_upsert",
  "alvo_user_id": "00000000-0000-0000-0000-000000000000",
  "papel": "gerente",
  "detalhes": {
    "origem": "ui_acessos"
  }
}
```

### Perfil - delete

```json
{
  "action": "perfil_delete",
  "alvo_user_id": "00000000-0000-0000-0000-000000000000"
}
```

### Vinculo - upsert

```json
{
  "action": "vinculo_upsert",
  "alvo_user_id": "00000000-0000-0000-0000-000000000000",
  "alvo_filial_id": "filial-1"
}
```

### Vinculo - delete

```json
{
  "action": "vinculo_delete",
  "alvo_user_id": "00000000-0000-0000-0000-000000000000",
  "alvo_filial_id": "filial-1"
}
```

## Contrato de sucesso

```json
{
  "ok": true,
  "data": {
    "action": "perfil_upsert",
    "ator_user_id": "11111111-1111-1111-1111-111111111111",
    "alvo_user_id": "22222222-2222-2222-2222-222222222222",
    "alvo_filial_id": null,
    "recurso": "user_perfis",
    "result": {
      "user_id": "22222222-2222-2222-2222-222222222222",
      "papel": "gerente"
    }
  }
}
```

## Contrato de erro

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Somente admin pode executar operacoes administrativas de acesso."
  }
}
```

Codigos previstos:

- `AUTH_MISSING`
- `AUTH_INVALID`
- `FORBIDDEN`
- `INVALID_ACTION`
- `INVALID_USER_ID`
- `INVALID_ROLE`
- `INVALID_FILIAL_ID`
- `SELF_PROFILE_DELETE_FORBIDDEN`
- `FILIAL_NOT_FOUND`
- `ACCESS_OPERATION_FAILED`
- `AUDIT_INSERT_FAILED`

## Decisoes de seguranca

- a funcao usa o JWT do proprio usuario
- a funcao revalida papel `admin` antes de qualquer escrita
- as escritas continuam sujeitas a RLS/RBAC do banco
- a auditoria administrativa e registrada dentro da function

## Limitacoes conhecidas do v1

- operacao principal e auditoria ainda nao rodam em transacao SQL unica
- se a auditoria falhar apos a escrita, a resposta volta erro `AUDIT_INSERT_FAILED`, mas a operacao principal pode ja ter sido aplicada
- a mitigacao operacional neste v1 e: investigar a auditoria antes de repetir a requisicao

## Proximo passo recomendado

1. adaptar [filiais-acessos.js](/e:/Programas/sistema_comercial/modules/filiais-acessos.js) para chamar a function
2. criar smoke test do contrato da function
3. evoluir para v2 com RPC transacional se a trilha de auditoria precisar ser atomica
