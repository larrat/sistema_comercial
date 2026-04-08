# Relatorio de Reorganizacao do Repositorio

Data base: 2026-04-08  
Objetivo: limpar a raiz, separar runtime por responsabilidade, preservar o funcionamento atual e arquivar itens redundantes sem exclusao destrutiva.

## Arvore antiga resumida

```text
/
  core/
  cotacao/
  css/
  docs/
  js/
  modules/
  node_modules/
  scripts/
  sql/
  supabase/
  test-results/
  tests/
  index.html
  package.json
  package-lock.json
  playwright.config.js
  README.md
  .tmp_path.txt
  AUDITORIA_EXECUTIVA_UX_UI_2026-04-07.md
  GOVERNANCA_VISUAL.md
  PLANO_EXECUTIVO_FASE_B.md
  REVISAO_TAREFAS.md
```

## Arvore nova

```text
/
  .vscode/
  docs/
    arquitetura/
    arquivo-legado/
    backend/
    dashboard/
    design-system/
    feedback/
    fluxos/
    governanca/
    mobile/
    release/
    telemetria/
  node_modules/
  scripts/
  sql/
  src/
    app/
    features/
      cotacao/
    shared/
    styles/
  supabase/
  test-results/
  tests/
  index.html
  package.json
  package-lock.json
  playwright.config.js
  README.md
```

## O que foi movido

### Runtime da aplicacao

- `js/api.js` -> `src/app/api.js`
- `js/local-config.js` -> `src/app/local-config.js`
- `js/main.js` -> `src/app/main.js`
- `js/store.js` -> `src/app/store.js`

- `core/app-context.js` -> `src/shared/app-context.js`
- `core/campanhas-domain.js` -> `src/shared/campanhas-domain.js`
- `core/dom.js` -> `src/shared/dom.js`
- `core/messages.js` -> `src/shared/messages.js`
- `core/module-registry.js` -> `src/shared/module-registry.js`
- `core/render-metrics.js` -> `src/shared/render-metrics.js`
- `core/utils.js` -> `src/shared/utils.js`

- `modules/*.js` -> `src/features/*.js`
- `cotacao/*.js` -> `src/features/cotacao/*.js`
- `css/style.css` -> `src/styles/style.css`

### Documentacao solta da raiz

- `AUDITORIA_EXECUTIVA_UX_UI_2026-04-07.md` -> `docs/arquitetura/`
- `REVISAO_TAREFAS.md` -> `docs/arquitetura/`
- `PLANO_EXECUTIVO_FASE_B.md` -> `docs/governanca/`
- `GOVERNANCA_VISUAL.md` -> `docs/design-system/`

### Arquivos arquivados, nao removidos

- `.tmp_path.txt` -> `docs/arquivo-legado/.tmp_path.txt`
- `core/export.js` -> `docs/arquivo-legado/core-stubs/export.js`
- `core/modal.js` -> `docs/arquivo-legado/core-stubs/modal.js`
- `core/navigation.js` -> `docs/arquivo-legado/core-stubs/navigation.js`

## O que foi mantido na raiz e por que

- `index.html`
  Entrada da SPA e ponto de carga do runtime.
- `package.json` / `package-lock.json`
  Dependencias e scripts do Node/Playwright.
- `playwright.config.js`
  Configuracao padrao do runner E2E.
- `README.md`
  Entrada documental basica do projeto.
- `.vscode/`
  Tarefas e recomendacoes do ambiente local.
- `docs/`, `scripts/`, `tests/`, `sql/`, `supabase/`
  Separacao clara por responsabilidade.
- `node_modules/`, `test-results/`
  Artefatos de tooling e execucao.

## O que foi considerado lixo, temporario ou gerado

- `node_modules/`
  Gerado por `npm install`.
- `test-results/`
  Gerado pelo Playwright.
- `.tmp_path.txt`
  Sem referencias no repositório e com conteudo temporario de caminho local; por cautela foi arquivado, nao apagado.
- `core/export.js`, `core/modal.js`, `core/navigation.js`
  Arquivos vazios, sem referencias encontradas no repositório; por cautela foram arquivados, nao apagados.

## O que foi removido

- Pastas antigas vazias:
  - `core/`
  - `js/`
  - `modules/`
  - `cotacao/`
  - `css/`

Observacao:
- a remocao foi apenas das cascas vazias, depois da migracao do conteudo.

## O que gerou duvida

- Documentacao historica ainda referencia caminhos antigos como `js/main.js`, `css/style.css` e `core/*`.
- Isso nao quebra runtime, mas deixa a camada documental parcialmente desatualizada.
- Por seguranca, nao houve reescrita ampla de todos os docs historicos neste corte.

## Validacoes executadas

- atualizacao dos imports e caminhos do runtime
- atualizacao das referencias de `index.html` para `src/`
- busca por caminhos antigos no runtime
- verificacao manual de que as pastas antigas ficaram vazias antes da remocao

## Riscos encontrados

- Documentacao residual apontando para caminhos antigos pode causar ruído de onboarding.
- Algum uso externo manual de `.tmp_path.txt` ou dos stubs vazios de `core/` poderia existir fora do repositório; por isso eles foram arquivados, nao excluidos.
- Nao houve rodada completa de execucao E2E neste host apos a reorganizacao.

## Sugestoes adicionais

1. normalizar gradualmente a documentacao historica para `src/`
2. adicionar `.gitignore` formal para `node_modules/` e `test-results/` se ainda nao existir
3. evoluir `src/features/` para subpastas por dominio quando a Fase 2 estabilizar mais
4. criar um alias de import no futuro, se houver bundler ou tooling apropriado
