# Checklist de Execucao - Fases 3 e 4

## Objetivo

Controlar a implantacao da migracao incremental e da politica de engenharia.

## Status atual

### Fase 3 - Plano de migracao

- [x] Estrategia de migracao definida como Strangler Fig hibrido
- [x] Matriz de priorizacao por modulo definida
- [x] Roadmap de sprints definido
- [x] Plano de rollback por camada definido
- [x] Modulo piloto escolhido oficialmente
- [ ] Feature flags por modulo definidas
- [ ] Criterios de aceite por sprint formalizados no board

### Fase 4 - Politica de engenharia

- [x] Politica de engenharia documentada
- [x] Template de ADR criado
- [x] Template de PR criado
- [x] Guia de contribuicao inicial criado
- [x] ESLint configurado
- [x] Prettier configurado
- [x] Husky configurado
- [x] lint-staged configurado
- [x] Workflow de CI criado
- [ ] Gates de merge definidos
- [x] Coverage threshold proposto
- [x] Checklist de code review publicado

## Proxima onda de execucao

### Prioridade 1

- [x] Criar `.github/PULL_REQUEST_TEMPLATE.md`
- [x] Criar `CONTRIBUTING.md`
- [x] Criar template de ADR
- [x] Criar workflow inicial de CI

### Prioridade 2

- [x] Adicionar ESLint
- [x] Adicionar Prettier
- [x] Adicionar Husky
- [x] Adicionar lint-staged

### Prioridade 3

- [x] Ativar typecheck no CI
- [x] Ativar Playwright no CI
- [x] Definir proposta de policy de branch e revisao
- [x] Criar `CODEOWNERS` inicial
- [x] Definir proposta de coverage por fase

## Registro de execucao

### 2026-04-10

- [x] Politica de engenharia criada
- [x] Checklist executivo criado
- [x] Template de ADR criado
- [x] Template de PR criado
- [x] Guia inicial de contribuicao criado
- [x] ESLint inicial configurado
- [x] Prettier inicial configurado
- [x] Workflow inicial de CI criado
- [x] Bug em `notificacoes.js` corrigido durante a ativacao do lint
- [x] `typecheck` e `typecheck:strict` estabilizados e passando
- [x] `lint` estabilizado e utilizavel como gate real
- [x] `format:check` estabilizado e passando
- [x] Checklist de code review publicado
- [x] Proposta objetiva de branch protection documentada
- [x] `CODEOWNERS` inicial criado
- [x] Proposta de threshold de coverage documentada
- [x] `clientes` oficializado como modulo piloto
- [x] Coverage do modulo piloto preparado no CI
- [x] Migracao do piloto iniciada com regra de identidade extraida para TypeScript testavel
- [x] Stores e hook React do piloto `clientes` cobertos por testes
- [x] Adapter React de leitura/escrita de `clientes` extraido e testado
- [x] Primeira UI real de escrita do piloto `clientes` plugada e testada
- [x] Remocao real e resumo contextual do cliente adicionados ao piloto React
- [x] Abas leves e notas/historico iniciados no detalhe do piloto `clientes`
- [x] Coverage React estabilizado acima do threshold apos a camada de notas
- [x] Fidelidade iniciada no detalhe React com saldo, historico e lancamento manual
- [x] Notas/historico aproximados do layout legado no detalhe React
- [x] Primeira ponte preparada entre `pg-clientes` legado e shell React
- [x] Bridge React real registrada para montar o piloto no `cli-react-root`
- [ ] Falta aplicar branch protection no GitHub
