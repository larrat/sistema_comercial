# Checklist Preenchivel - Fase 1

Data base: 2026-04-08  
Uso: marcar o que ja foi concluido no codigo e o que ainda depende de ambiente

## Legenda

- `Agora`: pode marcar imediatamente com base no que ja foi implementado no repositorio
- `Ambiente`: depende de deploy, validacao no banco, smoke real ou evidencia operacional

## 1. Configuracao de ambiente

- [ ] remover defaults sensiveis como caminho operacional  
  Status sugerido: Agora  
  Obs: hardening feito em `src/app/api.js`

- [ ] exigir `window.__SC_SUPABASE_URL__` e `window.__SC_SUPABASE_KEY__` ou equivalentes persistidos  
  Status sugerido: Agora  
  Obs: app ja falha sem config valida

- [ ] manter opt-in legado apenas para transicao local controlada  
  Status sugerido: Agora  
  Obs: legado ficou explicito e controlado

- [ ] registrar como configurar ambiente dev, homolog e prod  
  Status sugerido: Ambiente  
  Obs: depende de preenchimento operacional final

## 2. RLS e RBAC

- [ ] bloquear uso de `sql/01b_rls_anon_dev.sql` fora de dev explicito  
  Status sugerido: Agora  
  Obs: guardrail ja implementado

- [ ] validar que `01b` exige `set app.allow_anon_rls = 'true'` e `set app.environment = 'dev'` ou `local`  
  Status sugerido: Agora  
  Obs: ja endurecido no script

- [ ] validar `sql/02_rls_producao.sql`  
  Status sugerido: Ambiente  
  Obs: precisa reaplicar/confirmar no banco

- [ ] validar `sql/03_rbac_v1.sql`  
  Status sugerido: Ambiente  
  Obs: precisa execucao/checagem real

- [ ] validar `sql/04_rbac_v2_admin_only.sql`  
  Status sugerido: Ambiente  
  Obs: precisa execucao/checagem real

- [ ] validar `sql/05_rbac_auditoria_acessos.sql`  
  Status sugerido: Ambiente  
  Obs: precisa execucao/checagem real

- [ ] executar checklist por role e por tabela critica  
  Status sugerido: Ambiente  
  Obs: depende do banco alvo

- [ ] seguir ordem oficial documentada em `docs/governanca/GOVERNANCA_SQL_RLS.md`  
  Status sugerido: Agora  
  Obs: governanca ja documentada

- [ ] executar `sql/05b_validacao_fase_1_rls_rbac.sql`  
  Status sugerido: Ambiente  
  Obs: validacao real do banco

- [ ] registrar evidencias seguindo `docs/governanca/VALIDACAO_RLS_RBAC_FASE_1.md`  
  Status sugerido: Ambiente  
  Obs: apos execucao no ambiente

## 3. Schema e persistencia

- [ ] remover fallback de schema no cliente  
  Status sugerido: Agora  
  Obs: fallback estrutural removido

- [ ] falhar explicitamente quando schema esperado nao existir  
  Status sugerido: Agora  
  Obs: comportamento endurecido

- [ ] registrar divergencias encontradas no ambiente  
  Status sugerido: Ambiente  
  Obs: so apos validacao real

## 4. Evidencias minimas

- [ ] capturas ou logs de validacao de RLS  
  Status sugerido: Ambiente  
  Obs: depende da execucao no banco

- [ ] lista de variaveis/configuracoes por ambiente  
  Status sugerido: Ambiente  
  Obs: precisa preenchimento operacional

- [ ] diff validado dos arquivos alterados  
  Status sugerido: Agora  
  Obs: checks locais ja passaram

- [ ] criterio de rollback definido para a fase  
  Status sugerido: Ambiente  
  Obs: ideal registrar com time/ambiente alvo

## 5. Contratos minimos e funcoes criticas

- [ ] validar contrato minimo `SB.*` documentado em `docs/backend/CONTRATO_MINIMO_SB_V1.md`  
  Status sugerido: Agora  
  Obs: contrato criado e consumidores criticos migrados

- [ ] validar contrato da Edge Function `campanhas-gerar-fila`  
  Status sugerido: Agora  
  Obs: contrato documentado

- [ ] executar smoke test de `campanhas-gerar-fila` conforme `docs/backend/SMOKE_TEST_EDGE_FUNCTION_CAMPANHAS.md`  
  Status sugerido: Ambiente  
  Obs: depende de deploy + JWT + BaseUrl

- [ ] validar contrato da Edge Function `acessos-admin`  
  Status sugerido: Agora  
  Obs: contrato documentado e frontend integrado

- [ ] executar smoke test de `acessos-admin` conforme `docs/backend/SMOKE_TEST_EDGE_FUNCTION_ACESSOS_ADMIN.md`  
  Status sugerido: Ambiente  
  Obs: depende de deploy + JWT + BaseUrl

- [ ] validar contrato da Edge Function `acessos-admin-read`  
  Status sugerido: Agora  
  Obs: contrato documentado e frontend integrado

- [ ] executar smoke test de `acessos-admin-read` conforme `docs/backend/SMOKE_TEST_EDGE_FUNCTION_ACESSOS_ADMIN_READ.md`  
  Status sugerido: Ambiente  
  Obs: depende de deploy + JWT + BaseUrl

- [ ] registrar decisao sobre migracao de leitura administrativa sensivel para backend na frente de acessos  
  Status sugerido: Agora  
  Obs: decisao ja executada no codigo
