# Politica de Engenharia

## Objetivo

Garantir que toda nova entrega do projeto seja:

- tipada
- testavel
- segura
- revisavel
- operavel em producao

Esta politica vale para frontend, backend, banco, automacoes e documentacao tecnica.

## Regras obrigatorias

### Tipagem

- Todo codigo novo deve nascer em TypeScript strict.
- `any` e proibido por padrao.
- Excecoes exigem justificativa no PR.
- Codigo legado so pode crescer se houver motivo funcional claro.

### Qualidade

- ESLint e Prettier obrigatorios.
- Nenhum PR pode ser mergeado com lint falhando.
- Nenhum PR pode ser mergeado com typecheck falhando.
- Nenhum PR pode ser mergeado com testes falhando.

### Commits

- Conventional Commits obrigatorios:
  - `feat:`
  - `fix:`
  - `refactor:`
  - `docs:`
  - `test:`
  - `chore:`

### Revisao

- Todo PR precisa de ao menos 1 aprovacao.
- Mudanca critica exige 2 aprovacoes.
- PR sem contexto, risco e plano de teste nao deve ser aprovado.

### Seguranca

- Nenhum secret hardcoded.
- Nenhum token sensivel em log.
- Toda entrada externa deve ser validada.
- Toda renderizacao HTML dinamica deve ser sanitizada ou substituida por render seguro.

### Banco

- Toda alteracao em schema deve ter migration versionada.
- Nenhuma alteracao manual em producao fora do fluxo oficial.
- Toda migration deve informar objetivo, impacto e rollback.

### Documentacao

- Funcoes publicas e modulos relevantes devem ser documentados.
- Toda decisao arquitetural relevante precisa de ADR.
- README de modulo deve existir para modulos novos.

## Definicao de pronto

Uma tarefa so esta pronta quando:

- codigo implementado
- testes adequados criados ou atualizados
- lint passando
- typecheck passando
- documentacao minima atualizada
- rollback conhecido
- PR revisado e aprovado

## Excecoes

Excecoes sao aceitas apenas quando:

- existe urgencia operacional real
- o risco esta explicito
- o debito esta documentado
- ha plano de correcao posterior
