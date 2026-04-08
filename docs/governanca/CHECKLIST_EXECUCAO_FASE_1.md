# Checklist de Execucao - Fase 1

Data base: 2026-04-08  
Status: em andamento  
Objetivo: conter risco imediato de ambiente, RLS e drift de schema sem abrir regressao operacional desnecessaria.

## Escopo da Fase 1
- hardening da configuracao do Supabase
- bloqueio de fallback estrutural no cliente
- congelamento de caminhos inseguros de RLS
- validacao operacional do ambiente

## Itens obrigatorios

### 1. Configuracao de ambiente
- [ ] remover defaults sensiveis como caminho operacional
- [ ] exigir `window.__SC_SUPABASE_URL__` e `window.__SC_SUPABASE_KEY__` ou equivalentes persistidos
- [ ] manter opt-in legado apenas para transicao local controlada
- [ ] registrar como configurar ambiente dev, homolog e prod

### 2. RLS e RBAC
- [ ] bloquear uso de `sql/01b_rls_anon_dev.sql` fora de dev explicito
- [ ] validar que `01b` exige `set app.allow_anon_rls = 'true'` e `set app.environment = 'dev'` ou `local`
- [ ] validar `sql/02_rls_producao.sql`
- [ ] validar `sql/03_rbac_v1.sql`
- [ ] validar `sql/04_rbac_v2_admin_only.sql`
- [ ] validar `sql/05_rbac_auditoria_acessos.sql`
- [ ] executar checklist por role e por tabela critica
- [ ] seguir ordem oficial documentada em `docs/governanca/GOVERNANCA_SQL_RLS.md`
- [ ] executar `sql/05b_validacao_fase_1_rls_rbac.sql`
- [ ] registrar evidencias seguindo `docs/governanca/VALIDACAO_RLS_RBAC_FASE_1.md`

### 3. Schema e persistencia
- [ ] remover fallback de schema no cliente
- [ ] falhar explicitamente quando schema esperado nao existir
- [ ] registrar divergencias encontradas no ambiente

### 4. Evidencias minimas
- [ ] capturas ou logs de validacao de RLS
- [ ] lista de variaveis/configuracoes por ambiente
- [ ] diff validado dos arquivos alterados
- [ ] criterio de rollback definido para a fase

### 5. Contratos minimos e funcoes criticas
- [ ] validar contrato minimo `SB.*` documentado em `docs/backend/CONTRATO_MINIMO_SB_V1.md`
- [ ] validar contrato da Edge Function `campanhas-gerar-fila`
- [ ] executar smoke test de `campanhas-gerar-fila` conforme `docs/backend/SMOKE_TEST_EDGE_FUNCTION_CAMPANHAS.md`
- [ ] validar contrato da Edge Function `acessos-admin`
- [ ] executar smoke test de `acessos-admin` conforme `docs/backend/SMOKE_TEST_EDGE_FUNCTION_ACESSOS_ADMIN.md`
- [ ] validar contrato da Edge Function `acessos-admin-read`
- [ ] executar smoke test de `acessos-admin-read` conforme `docs/backend/SMOKE_TEST_EDGE_FUNCTION_ACESSOS_ADMIN_READ.md`
- [ ] registrar decisao sobre migracao de leitura administrativa sensivel para backend na frente de acessos

## Arquivos foco da fase
- `src/app/api.js`
- `sql/01b_rls_anon_dev.sql`
- `sql/02_rls_producao.sql`
- `sql/03_rbac_v1.sql`
- `sql/04_rbac_v2_admin_only.sql`
- `sql/05_rbac_auditoria_acessos.sql`
- `sql/05b_validacao_fase_1_rls_rbac.sql`
- `docs/governanca/ROADMAP_EXECUCAO_TECNICA_2026-04-08.md`
- `docs/governanca/GOVERNANCA_SQL_RLS.md`
- `docs/governanca/VALIDACAO_RLS_RBAC_FASE_1.md`
- `docs/backend/CONTRATO_MINIMO_SB_V1.md`
- `docs/backend/EDGE_FUNCTION_CAMPANHAS_GERAR_FILA_V1.md`
- `docs/backend/SMOKE_TEST_EDGE_FUNCTION_CAMPANHAS.md`
- `docs/backend/EDGE_FUNCTION_ACESSOS_ADMIN_V1.md`
- `docs/backend/SMOKE_TEST_EDGE_FUNCTION_ACESSOS_ADMIN.md`
- `docs/backend/EDGE_FUNCTION_ACESSOS_ADMIN_READ_V1.md`
- `docs/backend/SMOKE_TEST_EDGE_FUNCTION_ACESSOS_ADMIN_READ.md`
- `scripts/smoke/campanhas-gerar-fila.ps1`
- `scripts/smoke/acessos-admin.ps1`
- `scripts/smoke/acessos-admin-read.ps1`

## Evidencias e bloqueios desta execucao
- 2026-04-08: tentativa de publicar `acessos-admin` e `acessos-admin-read` bloqueada neste host por ausencia de `supabase` CLI
- 2026-04-08: tentativa de preparar execucao real dos smokes bloqueada neste host por ausencia de `node`, `npm`, `npx` e credenciais/JWT de ambiente
- 2026-04-08: smoke da leitura administrativa criado no repositório e pronto para execucao no ambiente vinculado

## Criterio de saida da Fase 1
- nenhum ambiente produtivo depende de defaults sensiveis embutidos
- nenhum fluxo critico mascara drift de schema no cliente
- caminho inseguro de RLS fica formalmente congelado
- time consegue verificar ambiente com checklist unico e rastreavel
