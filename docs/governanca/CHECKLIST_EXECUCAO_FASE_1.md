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
- [x] remover defaults sensiveis como caminho operacional — opt-in explícito via `window.__SC_ALLOW_LEGACY_SUPABASE_DEFAULTS__`; padrão é falhar sem config válida
- [x] exigir `window.__SC_SUPABASE_URL__` e `window.__SC_SUPABASE_KEY__` ou equivalentes persistidos — `ensureSupabaseConfig()` em `src/app/api.js` lança `SB_CONFIG_MISSING` se ausentes
- [x] manter opt-in legado apenas para transicao local controlada — `ALLOW_LEGACY_SUPABASE_DEFAULTS` flag implementada
- [ ] registrar como configurar ambiente dev, homolog e prod — pendente documentação formal de ambientes

### 2. RLS e RBAC
- [x] bloquear uso de `sql/01b_rls_anon_dev.sql` fora de dev explicito — guardrail no próprio script exige `set app.allow_anon_rls = 'true'` e `set app.environment = 'dev'`
- [x] validar que `01b` exige `set app.allow_anon_rls = 'true'` e `set app.environment = 'dev'` ou `local` — confirmado no script
- [x] validar `sql/02_rls_producao.sql` — aplicado; políticas `p_*` authenticated-only presentes
- [x] validar `sql/03_rbac_v1.sql` — funções `can_access_filial`, `current_user_role`, `is_admin` confirmadas no DB
- [x] validar `sql/04_rbac_v2_admin_only.sql` — RBAC admin-only aplicado
- [x] validar `sql/05_rbac_auditoria_acessos.sql` — políticas de `acessos_auditoria` confirmadas
- [x] executar checklist por role e por tabela critica — 17/17 tabelas com `rls_habilitada = true`
- [x] seguir ordem oficial documentada em `docs/governanca/GOVERNANCA_SQL_RLS.md`
- [x] executar `sql/05b_validacao_fase_1_rls_rbac.sql` — executado via MCP em 2026-04-14
- [x] registrar evidencias seguindo `docs/governanca/VALIDACAO_RLS_RBAC_FASE_1.md` — resumo executivo registrado

### 3. Schema e persistencia
- [x] remover fallback de schema no cliente — `ensureSupabaseConfig()` lança erro explícito
- [x] falhar explicitamente quando schema esperado nao existir — comportamento implementado em `src/app/api.js`
- [x] registrar divergencias encontradas no ambiente — 8 políticas anon stray em `campanhas` e `jogos_agenda` encontradas e removidas (migração `drop_stray_anon_policies_campanhas_jogos_agenda`)

### 4. Evidencias minimas
- [x] capturas ou logs de validacao de RLS — resultado do bloco 9: `politicas_anon_abertas=0, usuarios_sem_perfil=0, usuarios_sem_filial=0, vinculos_filial_invalidos=0`
- [x] diff validado dos arquivos alterados — `sql/02_rls_producao.sql` atualizado com drops adicionais
- [ ] lista de variaveis/configuracoes por ambiente — pendente documentação formal
- [ ] criterio de rollback definido para a fase — pendente

### 5. Contratos minimos e funcoes criticas
- [x] validar contrato minimo `SB.*` — `SB.contractVersion = 'v1'`, `SB.toResult`, `SB.normalizeError`, `SB.isSbError` presentes em `src/app/api.js:573`
- [x] validar contrato da Edge Function `campanhas-gerar-fila` — ACTIVE (version 4) confirmado via MCP
- [ ] executar smoke test de `campanhas-gerar-fila` — pendente execução com credenciais de usuário
- [x] validar contrato da Edge Function `acessos-admin` — ACTIVE (version 4) confirmado via MCP
- [ ] executar smoke test de `acessos-admin` — pendente execução com credenciais de usuário
- [x] validar contrato da Edge Function `acessos-admin-read` — ACTIVE (version 3) confirmado via MCP
- [ ] executar smoke test de `acessos-admin-read` — pendente execução com credenciais de usuário
- [x] registrar decisao sobre migracao de leitura administrativa sensivel — acessos-admin-read em produção via Edge Function

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
