# Checklist de Execucao - Fase 2

Data base: 2026-04-08  
Status: em andamento  
Objetivo: estabilizar contratos, testes minimos, persistencia explicita e autorizacao funcional apos o fechamento operacional da Fase 1.

## Escopo da Fase 2
- consolidacao do contrato minimo da camada `SB.*`
- smoke suite dos fluxos criticos
- falha explicita de persistencia
- reforco de autorizacao funcional
- reducao dos acoplamentos mais perigosos entre frontend e dados

## Pre-condicao para abrir a fase
- [ ] Fase 1 fechada operacionalmente
- [ ] Edge Functions publicadas e validadas por smoke
- [ ] evidencias de deploy/smoke anexadas

## Itens obrigatorios

### 1. Contratos da camada `SB.*`
- [ ] revisar `docs/backend/CONTRATO_MINIMO_SB_V1.md` como baseline da fase
- [ ] confirmar consumidores criticos migrados para `SB.toResult(...)`
- [ ] mapear consumidores restantes fora do contrato minimo
- [ ] padronizar mensagens e codigos de erro nos modulos restantes
- [ ] impedir novos acessos criticos fora do contrato `SB.*`

### 2. Smoke suite minima
- [ ] definir ferramenta de execucao de smoke no ambiente do time
- [ ] usar `docs/governanca/FLUXOS_CRITICOS_SMOKE_SUITE_FASE_2.md` como ordem oficial da suite minima
- [ ] usar `docs/governanca/ROTEIRO_AUTOMACAO_INCREMENTAL_FASE_2.md` como plano de automacao incremental
- [ ] usar `docs/governanca/EXECUCAO_BACKEND_SUITE_FASE_2.md` como baseline da Onda A (`script first`)
- [ ] usar `docs/governanca/EXECUCAO_UI_CORE_FASE_2.md` como baseline da Onda B (`UI core`)
- [ ] usar `docs/governanca/IMPLEMENTACAO_ONDA_B_FASE_2.md` como baseline da implementacao inicial do harness UI
- [ ] automatizar smoke de login
- [ ] automatizar smoke de setup de filial
- [ ] automatizar smoke de carregar filial
- [ ] automatizar smoke de campanhas
- [ ] automatizar smoke de acessos
- [ ] registrar comando unico ou sequencia oficial de execucao
- [ ] validar runner unico da Fase 2 cobrindo Onda A e Onda B

### 3. Persistencia e falha explicita
- [ ] mapear pontos que ainda fazem fallback controlado no frontend
- [ ] classificar fallback aceitavel vs fallback proibido
- [ ] remover mascaramento de falha de persistencia onde ainda existir
- [ ] garantir que erro critico interrompe o fluxo quando necessario
- [ ] documentar pontos residuais aceitos temporariamente

### 4. Autorizacao funcional
- [ ] revisar guards da interface que ainda dependem de legado/visual
- [ ] confirmar que operacoes criticas tem validacao backend ou banco
- [ ] mapear rotas/telas com risco de falsa permissao visual
- [ ] registrar matriz de autorizacao funcional por fluxo critico

### 5. Estado global e organizacao do frontend
- [ ] mapear os dominios mais acoplados em `js/store.js`
- [ ] definir primeira segmentacao do estado por dominio
- [ ] reduzir dependencia direta de estado global mutavel nos fluxos criticos
- [ ] registrar pontos que ainda nao podem sair do store central nesta fase

### 6. Evidencias minimas
- [ ] output da smoke suite minima
- [ ] lista de consumidores migrados para `SB.toResult(...)`
- [ ] lista de fallbacks removidos e fallbacks residuais aceitos
- [ ] registro de revisao de autorizacao funcional
- [ ] diff validado dos arquivos alterados

## Arquivos foco da fase
- `js/api.js`
- `js/store.js`
- `modules/auth-setup.js`
- `modules/runtime-loading.js`
- `modules/filiais-acessos.js`
- `modules/campanhas.js`
- `modules/dashboard.js`
- `cotacao/importacao.js`
- `docs/backend/CONTRATO_MINIMO_SB_V1.md`
- `docs/governanca/ROADMAP_EXECUCAO_TECNICA_2026-04-08.md`
- `docs/governanca/FLUXOS_CRITICOS_SMOKE_SUITE_FASE_2.md`
- `docs/governanca/ROTEIRO_AUTOMACAO_INCREMENTAL_FASE_2.md`
- `docs/governanca/EXECUCAO_BACKEND_SUITE_FASE_2.md`
- `docs/governanca/EXECUCAO_UI_CORE_FASE_2.md`
- `docs/governanca/EXECUCAO_SUITE_COMPLETA_FASE_2.md`
- `docs/governanca/IMPLEMENTACAO_ONDA_B_FASE_2.md`
- `scripts/smoke/run-fase-2-backend-suite.ps1`
- `scripts/smoke/run-fase-2-ui-core.ps1`
- `scripts/smoke/run-fase-2-suite.ps1`
- `package.json`
- `playwright.config.js`
- `tests/e2e/login.spec.js`
- `tests/e2e/setup-filial.spec.js`
- `tests/e2e/bootstrap-filial.spec.js`

## Criterio de saida da Fase 2
- contratos minimos da camada `SB.*` aplicados nos fluxos criticos
- smoke suite minima executavel pelo time
- falhas de persistencia criticas deixam de ser mascaradas
- autorizacao funcional revisada e evidenciada
- base pronta para a Fase 3 de backend de dominio
