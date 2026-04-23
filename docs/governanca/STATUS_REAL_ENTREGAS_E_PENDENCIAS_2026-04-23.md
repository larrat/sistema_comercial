# STATUS_REAL_ENTREGAS_E_PENDENCIAS_2026-04-23

## Objetivo

Registrar, de forma consolidada, o que realmente entrou no produto/codigo, o que foi apenas encerrado por governanca ou dispensa operacional, e o que continua pendente de fato apos a revisao dos documentos de governanca.

Documentos revisados:
- `PLANO_SPRINT_UX_E_PRODUTO_2026-04-21.md`
- `PLANO_FECHAMENTO_BLOCOS_1_A_4_2026-04-21.md`
- `CHECKLIST_EXECUCAO_UX_E_PRODUTO_2026-04-21.md`
- `CODE_REVIEW_CHECKLIST.md`
- `PLANO_REMOCAO_LEGADO.md`
- `CHECKLIST_EXECUCAO_FASES_3_E_4.md`
- `BACKLOG_DEBT_CONTROL_UX_UI.md`
- `ENGINEERING_POLICY.md`
- `GOVERNANCA_SQL_RLS.md`
- `COVERAGE_THRESHOLD_PROPOSTA.md`

Referencias de commits principais:
- `721789e` - fechamento estrutural da Sprint 2
- `b6c6bf4` - responsividade e ergonomia da Sprint 3
- `d0678bf` - fechamento operacional da Sprint 3
- `8f837e6` - inicio da Sprint 4
- `1437837` - fechamento da Sprint 4
- `ce1a133` - revisao de governanca
- `a8eef61` - fechamento do plano de sprint UX/produto

## Resumo executivo

Os blocos 1 a 4 foram fechados em governanca e tiveram entregas reais no produto, principalmente em financeiro, navegacao, linguagem da interface, formularios, responsividade, lazy-load e maturidade visual.

Ainda assim, nem tudo que aparece marcado como concluido nos checklists significa validacao automatizada executada localmente. Parte do fechamento foi por decisao operacional, com risco residual aceito, porque este ambiente nao possui `node`/`npm` disponiveis no `PATH`.

Portanto, o estado correto e:
- produto e codigo avancaram de verdade em varias frentes
- governanca foi reconciliada e fechada
- validacao automatizada, evidencias visuais completas e parte da remocao de legado continuam pendentes

## Entrou de fato no codigo/produto

### Financeiro e contas a receber

- SQL 16 de consistencia de contas a receber foi aplicado em producao, conforme planos de fechamento.
- RPCs oficiais passaram a sustentar operacoes criticas:
  - `rpc_registrar_baixa`
  - `rpc_estornar_baixa`
  - `rpc_marcar_conta_pendente`
- Fluxos financeiros foram validados manualmente em ambiente real segundo os documentos:
  - baixa parcial
  - quitacao/receber tudo
  - bloqueio de baixa acima do valor
  - bloqueio de baixa em conta quitada
  - estorno
  - reabertura
  - integracao `Pedidos -> detalhe -> Receber tudo`
- `Contas Receber` opera pelo caminho React/bridge atual, com fluxo de recebimento acoplado ao backend transacional.

### Navegacao e arquitetura da informacao

- Menu principal reorganizado no `index.html` por grupos:
  - `Inicio`
  - `Cadastros`
  - `Vendas`
  - `Financeiro`
  - `Estoque`
  - `Marketing`
  - `Administracao`
- `Filiais` e `Acessos e permissoes` foram consolidados em `Administracao`.
- Foi criado smoke estrutural em `tests/e2e/sprint-2-structural-navigation.spec.js` para cobrir menu, navegacao e ausencia de `RCA` nos rotulos centrais.

### Linguagem de interface

- Rotulos visiveis centrais foram trocados de `RCA` para `Vendedor` em telas React de clientes e pedidos.
- O nome tecnico `rca` continua em hooks, APIs, tipos e store, sem migracao estrutural de dados.
- Linguagem de transicao/experimento foi reduzida em clientes, pedidos e documentos de produto.

### Formularios e ergonomia

- Cadastro de cliente recebeu melhorias reais:
  - mascaras/formatacao de telefone, WhatsApp e UF
  - validacao inline de e-mail
  - validacao de opt-ins dependentes de contato
  - rotulo visivel `Vendedor`
- Formulario de pedido recebeu preenchimento/default de prazo a partir do cliente ou pagamento por boleto.
- Aviso operacional foi mantido quando prazo imediato nao gera conta a receber automaticamente.

### Responsividade, foco e acessibilidade praticas

- CSS recebeu ajustes para grids responsivos (`grid-2`, `grid-3`, `grid-4`) e telas menores.
- Dashboard, formularios e linhas de pedido ganharam ajustes de layout mobile.
- Foco por teclado e tamanho minimo de toque foram reforcados em seletores globais.

### Performance percebida e carregamento

- Bridges diretos de `clientes`, `pedidos` e `contas-receber` passaram a carregar sob demanda por `loadDirectBridgeScript`.
- `dashboard-bridge.js` continua carregado de forma estatica na entrada.
- Overlay global de carregamento recebeu atraso curto para evitar piscadas em carregamentos rapidos.
- Skeletons/loaders foram ampliados em modulos como notificacoes/campanhas/runtime.

### Testes e governanca tecnica

- Foi criado smoke E2E da Sprint 2:
  - `tests/e2e/sprint-2-structural-navigation.spec.js`
- Foi criada suite E2E da Sprint 3:
  - `tests/e2e/sprint-3-critical-flows.spec.js`
- `package.json` possui scripts para:
  - `lint`
  - `typecheck`
  - `test:react`
  - `test:e2e`
- Politica de engenharia, checklist de code review, proposta de coverage, PR template, CODEOWNERS e CI existem no repo.

### Governanca/documentacao finalizada

- `PLANO_FECHAMENTO_BLOCOS_1_A_4_2026-04-21.md` foi fechado para Sprints 1 a 4.
- `CHECKLIST_EXECUCAO_UX_E_PRODUTO_2026-04-21.md` foi revalidado.
- `CODE_REVIEW_CHECKLIST.md` foi encerrado com ressalvas.
- `PLANO_SPRINT_UX_E_PRODUTO_2026-04-21.md` foi finalizado e reconciliado.

## Fechado por decisao operacional ou governanca, nao por execucao automatizada local

- Smoke tests criticos da Sprint 3 foram dispensados por decisao operacional para nao bloquear o fechamento.
- Alguns itens de checklist foram marcados como concluidos por auditoria documental/manual, nao por suite automatizada rodada neste shell.
- Code review foi aprovado com ressalvas, condicionado a CI ou ambiente com Node/npm antes de release tecnico.
- Personalizacao e automacao avancadas foram encaminhadas para backlog futuro, nao implementadas integralmente.
- "Smoke test completo por fase" e "evidencia visual por fase" nao foram produzidos de forma completa.

## Pendente de fato

### Validacao automatizada

- Rodar em ambiente com Node/npm:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:react`
  - `npm run test:e2e`
- Rodar especificamente:
  - `npm run test:e2e -- tests/e2e/sprint-2-structural-navigation.spec.js`
  - `npm run test:e2e -- tests/e2e/sprint-3-critical-flows.spec.js`
- Configurar `PLAYWRIGHT_EXECUTABLE_PATH` ou `E2E_BROWSER_CHANNEL` se o Chromium local continuar ausente.

### Evidencias de produto

- Criar evidencia visual completa por fase.
- Registrar smoke completo por fase.
- Registrar evidencia de navegacao, responsividade e fluxos criticos com data, ambiente e responsavel.

### Atalhos operacionais

- Criar atalhos principais persistentes para:
  - `registrar baixa`
  - `importar planilha`
- Hoje essas acoes existem como acoes contextuais/fluxos, mas nao como atalhos principais persistentes da home/topbar.

### Remocao de legado

O plano de remocao de legado ainda nao esta concluido. Estado real:

- React/caminho novo ja cobre:
  - `Clientes`
  - `Pedidos`
  - `Dashboard`
  - `Contas Receber`
- Ainda existem features de negocio em `src/features/` sem equivalente React completo:
  - `produtos.js`
  - `estoque.js`
  - `cotacao.js` e `src/features/cotacao/`
  - `campanhas.js` e `src/features/campanhas/`
  - `rcas.js`
  - `oportunidades-jogos.js`
  - `relatorios.js`
- Infraestrutura de bridge ainda existe e deve ser removida somente depois da migracao dos modulos restantes:
  - `src/legacy/bridges/`
  - bridge static do dashboard no `index.html`
  - bridges sob demanda de clientes, pedidos e contas a receber
- App shell ainda e majoritariamente vanilla/modular:
  - navegacao/sidebar
  - auth/setup
  - filiais/acessos
  - notificacoes
  - telemetria

### Engenharia e governanca operacional

- Aplicar branch protection no GitHub.
- Definir gates de merge como regra real no repositorio remoto.
- Formalizar criterios de aceite por sprint no board.
- Confirmar que CI esta rodando com lint, typecheck, testes React e Playwright.
- Revalidar coverage gate conforme proposta:
  - piloto/clientes ja existe como direcao
  - coverage global ainda nao deve bloquear legado

### SQL/RLS

- Manter evidencia de aplicacao dos scripts oficiais por ambiente.
- Registrar validacao por role e por tabela critica quando houver alteracao em SQL/RLS.
- Garantir que `01b_rls_anon_dev.sql` continue restrito a dev/local e nao coexista como pratica operacional em ambiente real.

### Backlog de debt/UX/UI

Itens ainda registrados como abertos ou em andamento:
- `D-001` - CSS base duplicado e camadas visuais concorrentes
- `D-002` - comando rapido/logica ativa sem UI correspondente
- `D-003` - descoberta mobile da area gerencial
- `D-004` - feedback de erro heterogeneo em fluxos criticos
- `F-001` - camada gerencial com insight + acao por KPI
- `F-002` - dashboard operacional com menor carga cognitiva
- `F-003` - recomendacoes inteligentes por contexto

## Contradicoes ou pontos que precisam ser reconciliados nos documentos antigos

- `PLANO_REMOCAO_LEGADO.md` ainda indica alguns itens de contas a receber como pendentes, mas os planos de fechamento posteriores registram validacao real/manual. O documento de legado precisa ser atualizado ou anotado como historico.
- `PLANO_FECHAMENTO_BLOCOS_1_A_4_2026-04-21.md` marca "smoke tests dos fluxos criticos concluidos", mas o proprio texto da Sprint 3 diz que eles foram dispensados. O status correto e: suite criada, execucao automatizada dispensada, risco residual aceito.
- `CODE_REVIEW_CHECKLIST.md` menciona "revalidacao do checklist de UX/produto ainda pendente no working tree" dentro do escopo inicial, mas esse item foi posteriormente commitado em `ce1a133`. O texto e historico, nao pendencia atual.

## Proximo plano recomendado

1. Rodar CI/testes em ambiente com Node/npm e Playwright.
2. Corrigir ou confirmar os resultados de lint/typecheck/testes.
3. Implementar atalhos persistentes para `registrar baixa` e `importar planilha`.
4. Atualizar `PLANO_REMOCAO_LEGADO.md` com o estado real atual.
5. Planejar proxima sprint de remocao de legado, com prioridade sugerida:
   - Produtos
   - Estoque
   - Cotacao
   - RCAs/Oportunidades
   - Relatorios
   - Campanhas
6. Produzir evidencias visuais e smokes por fase para fechar a lacuna documental.

## Decisao de leitura

Para gestao, considerar os blocos 1 a 4 encerrados com ressalvas.

Para engenharia/release, considerar pendente ate passar por CI/ambiente com Node/npm e ate reconciliar as pendencias de legado, evidencia e smokes completos.
