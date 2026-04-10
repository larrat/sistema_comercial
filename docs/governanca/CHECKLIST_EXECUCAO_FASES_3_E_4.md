# Checklist de Execucao - Fases 3 e 4

## Objetivo

Controlar a implantacao da migracao incremental e da politica de engenharia.

## Status atual

### Fase 3 - Plano de migracao

- [x] Estrategia de migracao definida como Strangler Fig hibrido
- [x] Matriz de priorizacao por modulo definida
- [x] Roadmap de sprints definido
- [x] Plano de rollback por camada definido
- [ ] Modulo piloto escolhido oficialmente
- [ ] Feature flags por modulo definidas
- [ ] Criterios de aceite por sprint formalizados no board

### Fase 4 - Politica de engenharia

- [x] Politica de engenharia documentada
- [x] Template de ADR criado
- [x] Template de PR criado
- [x] Guia de contribuicao inicial criado
- [x] ESLint configurado
- [x] Prettier configurado
- [ ] Husky configurado
- [ ] lint-staged configurado
- [x] Workflow de CI criado
- [ ] Gates de merge definidos
- [ ] Coverage threshold definido
- [ ] Checklist de code review publicado

## Proxima onda de execucao

### Prioridade 1

- [x] Criar `.github/PULL_REQUEST_TEMPLATE.md`
- [x] Criar `CONTRIBUTING.md`
- [x] Criar template de ADR
- [x] Criar workflow inicial de CI

### Prioridade 2

- [x] Adicionar ESLint
- [x] Adicionar Prettier
- [ ] Adicionar Husky
- [ ] Adicionar lint-staged

### Prioridade 3

- [x] Ativar typecheck no CI
- [x] Ativar Playwright no CI
- [ ] Definir policy de branch e revisao

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
- [ ] Repositorio ainda possui pendencias para `format:check`
