# Edge Function - Campanhas Gerar Fila v1

Data base: 2026-04-08  
Status: scaffold inicial pronto  
Objetivo: mover a geracao de fila de campanha do browser para backend de dominio leve.

## Artefatos
- [index.ts](/e:/Programas/sistema_comercial/supabase/functions/campanhas-gerar-fila/index.ts)
- [campanhas-domain.ts](/e:/Programas/sistema_comercial/supabase/functions/_shared/campanhas-domain.ts)

## Motivacao
Hoje o fluxo de campanha:
- consulta clientes no browser
- aplica regra de elegibilidade no browser
- verifica duplicidade no browser
- cria envios no browser

Isso gera:
- regra critica no frontend
- superficie de regressao alta
- diagnostico ruim
- baixa governanca para escala

## Escopo da v1
- endpoint `POST`
- autenticacao obrigatoria via Bearer token
- autorizacao server-side para `admin` e `gerente`
- leitura da campanha
- leitura dos clientes da filial
- filtro de elegibilidade
- checagem de duplicidade por `campanha_id + cliente_id + canal + data_ref`
- insercao da fila em `campanha_envios`
- modo `dry_run`

## Contrato de entrada
```json
{
  "campanha_id": "uuid-ou-id-textual",
  "dry_run": false
}
```

## Contrato de saida
Sucesso:
```json
{
  "ok": true,
  "data": {
    "campanha_id": "cmp_123",
    "filial_id": "filial-1",
    "dry_run": false,
    "criados": 12,
    "ignorados": 3,
    "falhas": 0,
    "total_elegiveis": 15
  }
}
```

Erro:
```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Somente gerente/admin pode gerar fila de campanha.",
    "details": null
  }
}
```

## Decisoes de seguranca
- usa JWT do usuario chamador
- nao depende de permissao visual do frontend
- valida papel em `user_perfis`
- usa o proprio contexto autenticado para acessar `campanhas`, `clientes` e `campanha_envios`

## Regras da v1
- campanha deve existir e estar ativa
- usuario precisa ser `admin` ou `gerente`
- cliente precisa respeitar o canal da campanha
- nao duplica envio do mesmo cliente/canal/data_ref

## Fora do escopo desta v1
- filas assincronas/background
- retry transacional
- logging estruturado externo
- auditoria detalhada por tentativa
- suporte a outros tipos de campanha alem de aniversario

## Integracao esperada no frontend
Substituir o fluxo atual de `gerarFilaCampanha(...)` por chamada HTTP para a Edge Function.

Payload sugerido:
```js
await fetch('/functions/v1/campanhas-gerar-fila', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    campanha_id: campanhaId,
    dry_run: false
  })
});
```

## Proximo passo recomendado
1. publicar a function no ambiente Supabase
2. adicionar smoke test do contrato
3. adaptar `modules/campanhas.js` para usar backend no lugar da geracao local
4. repetir o mesmo padrao para `acessos`
