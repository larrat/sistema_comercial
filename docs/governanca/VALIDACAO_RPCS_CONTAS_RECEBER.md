# Validacao das RPCs de Contas Receber

**Data:** 2026-04-29 15:20:38 -03  
**Escopo:** `rpc_registrar_baixa`, `rpc_estornar_baixa`, `rpc_marcar_conta_pendente`

## Contexto da validacao

Esta rodada cruzou:

- [docs/NORTE.md](/Users/larrat/sistema_comercial/sistema_comercial/docs/NORTE.md:1)
- [docs/governanca/MAPEAMENTO_MODULO_CONTAS_RECEBER.md](/Users/larrat/sistema_comercial/sistema_comercial/docs/governanca/MAPEAMENTO_MODULO_CONTAS_RECEBER.md:1)
- [docs/backend/CONTRATO_MINIMO_SB_V1.md](/Users/larrat/sistema_comercial/sistema_comercial/docs/backend/CONTRATO_MINIMO_SB_V1.md:1)
- [sql/16_contas_receber_backend_consistencia.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/16_contas_receber_backend_consistencia.sql:199)
- [src/react/features/contas-receber/services/contasReceberApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/services/contasReceberApi.ts:1)
- [src/react/features/contas-receber/hooks/useContasReceberMutations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/hooks/useContasReceberMutations.ts:1)

A validacao real de mutacao financeira **nao foi executada** porque este ambiente de CLI nao possui sessao autenticada reutilizavel com seguranca.  
Mesmo assim, foi possivel validar:

1. que as RPCs existem no SQL e no front;
2. que os endpoints REST estao expostos no projeto Supabase real;
3. que os payloads aceitos pelo front batem com a assinatura SQL;
4. que os endpoints retornam erros de dominio previsiveis quando chamados com IDs inexistentes.

## 1. RPC validada

### `rpc_registrar_baixa`

**Local de chamada no codigo**

- [src/react/features/contas-receber/hooks/useContasReceberMutations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/hooks/useContasReceberMutations.ts:69)
- [src/react/features/contas-receber/services/contasReceberApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/services/contasReceberApi.ts:91)
- SQL: [sql/16_contas_receber_backend_consistencia.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/16_contas_receber_backend_consistencia.sql:199)

**Payload esperado**

```json
{
  "p_baixa_id": "uuid-ou-id-texto",
  "p_conta_receber_id": "id-da-conta",
  "p_valor": 10.5,
  "p_recebido_em": "2026-04-29T00:00:00Z",
  "p_observacao": "texto-ou-null"
}
```

**Retorno esperado**

- SQL retorna `public.contas_receber`
- o front hoje trata apenas `HTTP ok / HTTP erro`
- em caso de erro, o service tenta extrair `body.message`

**Cenarios testados**

1. leitura do payload montado no front;
2. leitura da assinatura SQL;
3. chamada real ao endpoint REST do projeto com `p_conta_receber_id` inexistente e sem sessao autenticada de usuario:

```bash
curl -X POST \
  https://eiycrokqwhmfmjackjni.supabase.co/rest/v1/rpc/rpc_registrar_baixa \
  -H 'apikey: <publishable-key>' \
  -H 'Authorization: Bearer <publishable-key>' \
  -H 'Content-Type: application/json' \
  --data '{"p_baixa_id":"probe-noauth","p_conta_receber_id":"probe-noauth","p_valor":1,"p_recebido_em":"2026-04-29T00:00:00Z","p_observacao":"probe"}'
```

**Resultado**

- endpoint respondeu `HTTP 409`
- corpo:

```json
{"code":"23503","details":null,"hint":null,"message":"conta a receber nao encontrada"}
```

**Erro encontrado, se houver**

- a validacao de mutacao real ficou bloqueada por falta de sessao autenticada segura;
- o endpoint nao respondeu com erro de permissao, e sim com erro de dominio do banco.

**Recomendacao**

- validar em sessao real com conta de homologacao:
  - baixa parcial
  - receber tudo
  - conta com saldo ja quitado
  - tentativa de baixa acima do aberto
- revisar grants/execucao efetiva da RPC, porque o probe sem sessao nao caiu em erro de autorizacao.

**Status**

- **bloqueada por ambiente** para validacao financeira completa
- **parcialmente validada** quanto a existencia, assinatura e erro previsivel

---

### `rpc_estornar_baixa`

**Local de chamada no codigo**

- [src/react/features/contas-receber/hooks/useContasReceberMutations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/hooks/useContasReceberMutations.ts:128)
- [src/react/features/contas-receber/services/contasReceberApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/services/contasReceberApi.ts:124)
- SQL: [sql/16_contas_receber_backend_consistencia.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/16_contas_receber_backend_consistencia.sql:251)

**Payload esperado**

```json
{
  "p_baixa_id": "id-da-baixa"
}
```

**Retorno esperado**

- SQL retorna `public.contas_receber`
- o front hoje ignora o body de sucesso e apenas recarrega contas/baixas

**Cenarios testados**

1. leitura do payload montado no front;
2. leitura da assinatura SQL;
3. chamada real ao endpoint REST do projeto com `p_baixa_id` inexistente e sem sessao autenticada de usuario:

```bash
curl -X POST \
  https://eiycrokqwhmfmjackjni.supabase.co/rest/v1/rpc/rpc_estornar_baixa \
  -H 'apikey: <publishable-key>' \
  -H 'Authorization: Bearer <publishable-key>' \
  -H 'Content-Type: application/json' \
  --data '{"p_baixa_id":"probe-noauth"}'
```

**Resultado**

- endpoint respondeu `HTTP 500`
- corpo:

```json
{"code":"P0002","details":null,"hint":null,"message":"baixa nao encontrada"}
```

**Erro encontrado, se houver**

- a validacao de estorno real ficou bloqueada por falta de sessao autenticada segura;
- o erro de dominio veio com `500`, nao com `404/409`, o que pode dificultar leitura operacional no front.

**Recomendacao**

- validar em sessao real:
  - estorno de baixa unica
  - estorno apos baixa parcial
  - estorno com conta voltando para parcial
  - estorno de baixa inexistente
- considerar padronizar o envelope de erro no backend ou ao menos mapear `code` no front, porque hoje so `message` sobe.

**Status**

- **bloqueada por ambiente** para validacao financeira completa
- **parcialmente validada** quanto a existencia, assinatura e erro previsivel

---

### `rpc_marcar_conta_pendente`

**Local de chamada no codigo**

- [src/react/features/contas-receber/hooks/useContasReceberMutations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/hooks/useContasReceberMutations.ts:106)
- [src/react/features/contas-receber/services/contasReceberApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/services/contasReceberApi.ts:135)
- SQL: [sql/16_contas_receber_backend_consistencia.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/16_contas_receber_backend_consistencia.sql:279)

**Payload esperado**

```json
{
  "p_conta_receber_id": "id-da-conta"
}
```

**Retorno esperado**

- SQL retorna `public.contas_receber`
- o front hoje ignora o body de sucesso e apenas recarrega contas/baixas

**Cenarios testados**

1. leitura do payload montado no front;
2. leitura da assinatura SQL;
3. chamada real ao endpoint REST do projeto com `p_conta_receber_id` inexistente e sem sessao autenticada de usuario:

```bash
curl -X POST \
  https://eiycrokqwhmfmjackjni.supabase.co/rest/v1/rpc/rpc_marcar_conta_pendente \
  -H 'apikey: <publishable-key>' \
  -H 'Authorization: Bearer <publishable-key>' \
  -H 'Content-Type: application/json' \
  --data '{"p_conta_receber_id":"probe-noauth"}'
```

**Resultado**

- endpoint respondeu `HTTP 500`
- corpo:

```json
{"code":"P0002","details":null,"hint":null,"message":"conta a receber nao encontrada"}
```

**Erro encontrado, se houver**

- a validacao de reversao real ficou bloqueada por falta de sessao autenticada segura;
- novamente, o endpoint respondeu com erro de dominio e nao com erro de autorizacao.

**Recomendacao**

- validar em sessao real:
  - conta recebida integralmente voltando a pendente
  - conta parcial voltando a pendente
  - conta sem baixas
  - conta de outra filial
- conferir se a guarda `can_access_filial(...)` esta realmente protegendo como esperado no ambiente publicado.

**Status**

- **bloqueada por ambiente** para validacao financeira completa
- **parcialmente validada** quanto a existencia, assinatura e erro previsivel

## 2. Tratamento de erro atual no front

### Service

Em [contasReceberApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/services/contasReceberApi.ts:20):

- sucesso: nao consome o body de retorno da RPC;
- erro: se `body.message` existir, sobe apenas a mensagem;
- `code`, `status`, `details` e `hint` sao perdidos.

### Hook

Em [useContasReceberMutations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/hooks/useContasReceberMutations.ts:69):

- as mutacoes retornam `{ ok: boolean; error?: string }`
- a camada atual favorece UX simples, mas perde diagnostico fino

## 3. Achados importantes

### 3.1. Mismatch entre SQL e consumo

- as 3 RPCs retornam `public.contas_receber`
- o front trata todas como `Promise<void>`

Isso nao quebra o fluxo atual, mas deixa retorno util sem uso e aumenta ambiguidade de contrato.

### 3.2. Exposicao do endpoint sem sessao reutilizavel de usuario

O probe com `publishable key` conseguiu atingir a logica da RPC e receber erro de dominio do banco.  
Isso **nao valida** a operacao financeira, mas indica que:

- o endpoint existe no ambiente real;
- o payload bate com a assinatura SQL;
- a camada de permissao efetiva merece revisao, porque nao houve erro de autorizacao antes da execucao.

### 3.3. Falta de fixture segura de homologacao

Para validar consistencia financeira de verdade, ainda falta um conjunto controlado com:

- 1 conta pendente
- 1 conta parcial
- 1 conta recebida
- baixas conhecidas e descartaveis
- usuario autenticado com filial conhecida

## 4. Recomendacao geral

1. executar a validacao final com sessao autenticada real e fixture de homologacao;
2. registrar evidencia por caso:
   - antes da conta
   - chamada realizada
   - depois da conta
   - depois das baixas
3. revisar grants/permissao efetiva das 3 RPCs;
4. decidir se o front deve:
   - continuar ignorando o body de sucesso
   - ou passar a consumir o retorno tipado da conta atualizada
5. endurecer erro para fluxos criticos com o contrato do `SB.normalizeError(...)`.

## 5. Resumo de status

| RPC | Status | Evidencia real | Bloqueio |
|---|---|---|---|
| `rpc_registrar_baixa` | bloqueada por ambiente | endpoint respondeu `409` com erro de dominio | sem sessao autenticada segura para mutacao |
| `rpc_estornar_baixa` | bloqueada por ambiente | endpoint respondeu `500` com `baixa nao encontrada` | sem sessao autenticada segura para mutacao |
| `rpc_marcar_conta_pendente` | bloqueada por ambiente | endpoint respondeu `500` com `conta a receber nao encontrada` | sem sessao autenticada segura para mutacao |
