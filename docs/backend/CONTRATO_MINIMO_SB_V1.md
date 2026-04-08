# Contrato Minimo SB v1

Data base: 2026-04-08  
Escopo: padronizacao minima da camada `SB.*` em `js/api.js`.

## Objetivo
- manter compatibilidade com os consumidores atuais
- padronizar erro e parsing
- oferecer helpers minimos para consumo seguro

## Superficie publica nova
- `SB.contractVersion`
- `SB.normalizeError(err)`
- `SB.toResult(promiseOrFactory)`
- `SB.isSbError(err)`

## Formato minimo de erro
Os erros normalizados da camada `SB.*` passam a seguir este shape:

```js
{
  name: 'SbApiError',
  message: '...',
  status: 401,
  code: 'SB_AUTH_FORBIDDEN',
  source: 'supabase',
  operation: 'GET clientes',
  resource: 'clientes',
  details: { ... },
  retryable: false
}
```

## Regras
- metodos existentes continuam retornando `data` diretamente
- falhas deixam de depender apenas de `Error` solto
- chamadas externas via `fetchJsonWithRetry` seguem o mesmo contrato de erro

## Uso recomendado

### Fluxo atual com `try/catch`
```js
try {
  const clientes = await SB.getClientes(filialId);
} catch (err) {
  const e = SB.normalizeError(err);
  console.error(e.code, e.status, e.details);
}
```

### Fluxo sem throw com `toResult`
```js
const result = await SB.toResult(() => SB.getClientes(filialId));
if (!result.ok) {
  console.error(result.error.code, result.error.message);
  return;
}
const clientes = result.data || [];
```

## Escopo ja coberto nesta etapa
- validacao obrigatoria de configuracao do Supabase
- `sbReq(...)`
- `signInWithPassword(...)`
- `fetchJsonWithRetry(...)`

## Proximo passo
- migrar consumidores mais sensiveis para `SB.toResult(...)`
- padronizar envelope de sucesso/erro para fluxos criticos
- reduzir regra de dominio em `js/api.js`
