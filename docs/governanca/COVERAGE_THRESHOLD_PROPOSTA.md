# Proposta de Threshold de Coverage por Fase

## Objetivo

Definir uma politica de cobertura progressiva e realista para a migracao incremental deste projeto.

O objetivo nao e inflar numeros. O objetivo e proteger fluxos criticos sem travar a equipe com uma meta artificial cedo demais.

## Principios

- cobertura e meio, nao fim
- modulo critico precisa de cobertura antes de crescer
- cobertura de codigo legado nao deve bloquear limpeza incremental no primeiro momento
- thresholds devem acompanhar a maturidade do novo codigo

## Escopo de cobertura

Esta proposta considera principalmente:

- testes unitarios
- testes de integracao

E2E continua obrigatorio para fluxos principais, mas nao entra sozinho como metrica de threshold de coverage.

## Fase 0 - Baseline atual

### Objetivo

Medir sem bloquear.

### Regra

- sem threshold global obrigatorio
- gerar baseline por modulo novo assim que a stack de testes estiver pronta

### Status do gate

- informativo

## Fase 1 - Infraestrutura e modulo piloto

### Objetivo

Exigir cobertura minima apenas para codigo novo.

### Threshold recomendado

- modulo piloto novo: `60%`
- linhas: `60%`
- funcoes: `60%`
- branches: `45%`

### Regra

- nao bloquear legado antigo por coverage
- bloquear apenas o modulo piloto novo e seus testes

## Fase 2 - Modulos core migrados

### Objetivo

Subir a barra para os modulos que sustentam operacao.

### Modulos core

- auth
- clientes
- pedidos
- campanhas
- acessos
- fidelidade

### Threshold recomendado

- linhas: `70%`
- funcoes: `75%`
- branches: `55%`

### Regra

- modulos core novos entram com threshold obrigatorio
- codigo legado fora da trilha migrada nao bloqueia merge por coverage global

## Fase 3 - Expansao do frontend e backend novo

### Objetivo

Consolidar qualidade em areas ja migradas.

### Threshold recomendado

- linhas: `80%`
- funcoes: `80%`
- branches: `65%`

### Regra

- obrigatorio para modulos migrados
- permitido manter excecoes documentadas em areas ainda em strangler

## Fase 4 - Cutover e estabilizacao

### Objetivo

Chegar ao nivel-alvo dos modulos principais em producao.

### Threshold recomendado

- modulos criticos: `80%+`
- modulos administrativos: `70%+`
- branches em modulos criticos: `70%`

### Regra

- nenhuma area critica nova entra abaixo do threshold
- quedas de coverage precisam de justificativa aprovada no PR

## Proposta pratica de adocao no CI

### Agora

- manter `quality` e `e2e-ui-core` como gates obrigatorios
- coverage ainda nao bloqueia merge
- publicar relatorio de coverage quando a stack de testes unitarios/integracao estiver pronta

### Proximo marco

Assim que o modulo piloto novo estiver no ar:

- adicionar check de coverage para o modulo piloto
- exigir `60%` nesse modulo

### Depois

Quando `clientes` e `pedidos` estiverem migrados:

- coverage obrigatorio por modulo
- sem threshold global unico para o repo inteiro

## Recomendacao tecnica

Usar threshold por modulo ou diretório, nao um threshold global cego.

Motivo:

- o repo ainda tem legado convivendo com migracao incremental
- threshold global agora puniria o contexto errado
- threshold por modulo protege melhor a nova arquitetura

## Regra de excecao

Cobertura abaixo do threshold so pode passar quando:

- a urgencia operacional estiver documentada
- o risco estiver claro
- existir plano de compensacao
- a excecao estiver registrada no PR

## Resumo executivo

### Agora

- sem bloqueio global por coverage
- coverage como metrica orientadora

### Curto prazo

- `60%` no modulo piloto

### Medio prazo

- `70%` nos modulos core migrados

### Alvo

- `80%` nos modulos criticos da nova arquitetura
