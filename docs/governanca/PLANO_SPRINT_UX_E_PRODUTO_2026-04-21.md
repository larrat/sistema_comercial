# PLANO_SPRINT_UX_E_PRODUTO_2026-04-21

## Estado em 2026-04-21

| Item | Situacao |
|------|---------|
| RPCs de contas a receber implementadas no codigo | Feito (commit fb172e8) |
| SQL 16 preparado (`contas_receber_backend_consistencia`) | **Aplicado em producao (2026-04-21)** |
| Contas a receber react-only, shell legado removido | Feito (commits 42d7b15 e 5976676) |
| Validacao das RPCs e do fluxo real de receber no ambiente real | Pendente |
| Dashboard React ativo por padrao | Feito (commit 3705559) |
| Clientes react-only, legado removido | Feito (commits 2026-04-17/18) |
| Sidebar Fluig | Feita (commit 46f7404) |
| Bloco 3 de UX (home por perfil, favoritos e atalhos) | Feito (commit 79f8165) |
| Bloco 4 de UX (formularios e fluxos operacionais) | Feito (commits 8cc8db8 e 911fa81) |

---

## Objetivo

Transformar o checklist de UX, produto e confianca operacional em um plano executavel de curto prazo, com foco em impacto real sobre:

- clareza de entrada
- confianca dos dados
- navegacao
- produtividade operacional
- percepcao de maturidade do sistema

## Bloco 1 - Agora

Horizonte sugerido: imediato

### Meta principal

Corrigir o que mais atrapalha entendimento basico, confianca e uso diario.

### Entregas

- [x] aplicar e validar estruturalmente a migration de contas a receber
- [x] virar contas a receber para React por padrao e remover o shell legado
- [ ] validar as RPCs e o fluxo real de contas a receber no ambiente real
- [ ] limpar linguagem interna exposta na interface
- [ ] remover placeholders e blocos experimentais visiveis
- [ ] separar fluxo de entrada:
  - [ ] entrar com conta
  - [ ] criar empresa/filial
  - [ ] escolher filial depois do login
- [ ] reduzir o menu principal para grupos mais claros
- [ ] redesenhar a primeira dobra da home/dashboard
- [ ] criar estados vazios acionaveis nos modulos mais importantes

### Escopo alvo

- contas a receber
- login e entrada
- menu principal
- dashboard/home
- clientes e pedidos como fluxos de referencia

### Criterio de sucesso

- [ ] o usuario entende o proximo passo logo na entrada
- [ ] o dashboard deixa de parecer mural generico
- [ ] as operacoes financeiras criticas passam confianca no ambiente real
- [ ] a interface perde sinais evidentes de produto em transicao

### Nao entra neste bloco

- redesign visual amplo
- polimento estetico sem ganho funcional
- automacoes avancadas
- reformulacao completa de todos os formularios

## Bloco 2 - Proxima Etapa

Horizonte sugerido: depois de estabilizar o bloco 1

### Meta principal

Reduzir carga cognitiva e tornar os fluxos principais mais rapidos e previsiveis.

### Entregas

- [ ] criar onboarding progressivo com checklist inicial
- [ ] reorganizar arquitetura da informacao por objetivo do usuario
- [ ] revisar nomenclatura dos modulos e acoes
- [x] simplificar formularios principais:
  - [x] produto
  - [x] cliente
  - [x] campanha
  - [x] filial
  - [x] pedido
- [x] introduzir campos avancados sob demanda
- [x] padronizar CTAs:
  - [x] salvar
  - [x] cancelar
  - [x] voltar
  - [x] proximo
- [ ] melhorar feedbacks de sucesso, erro e loading
- [ ] revisar responsividade das telas operacionais mais usadas

### Criterio de sucesso

- [x] menos informacao exposta de uma vez
- [x] menos esforco manual para cadastrar e operar
- [x] maior consistencia entre modulos
- [ ] onboarding orientado a time to value

### Nao entra nesta etapa

- personalizacao profunda por perfil
- command palette
- automacoes mais sofisticadas

## Bloco 3 - Depois

Horizonte sugerido: melhorias futuras

### Meta principal

Refinar a experiencia para escala, maturidade e uso repetitivo.

### Entregas

- [ ] home personalizada por perfil
- [ ] dashboards separados por objetivo:
  - [ ] operacional
  - [ ] gerencial
  - [ ] analitico
- [ ] atalhos e favoritos por usuario
- [ ] busca global de telas e acoes
- [ ] formularios com preenchimento inteligente mais forte
- [ ] lazy-load mais agressivo e otimizacao de performance percebida
- [ ] padronizacao visual mais ampla entre todos os modulos
- [ ] refinamentos de acessibilidade

### Criterio de sucesso

- [ ] o sistema fica mais rapido para usuarios recorrentes
- [ ] a navegacao depende menos de memoria
- [ ] o produto parece maduro, consistente e escalavel

## Priorizacao executiva

### Prioridade maxima

- [ ] confianca do financeiro
- [ ] clareza da entrada
- [ ] simplificacao do menu
- [ ] foco da home
- [ ] remocao de ruido interno

### Prioridade media

- [ ] onboarding guiado
- [x] formularios mais inteligentes
- [ ] estados vazios melhores
- [ ] feedback operacional
- [ ] responsividade

### Prioridade futura

- [ ] personalizacao
- [ ] automacao
- [ ] busca global
- [ ] refinamento avancado de performance e acessibilidade

## Sequencia recomendada de trabalho

1. validar em ambiente real o fluxo React de contas a receber e a confianca operacional
2. redesenhar entrada e fluxo inicial
3. reorganizar menu e arquitetura da informacao
4. reduzir densidade e ruído da home
5. atacar formularios criticos
6. melhorar feedback, estados vazios e consistencia
7. otimizar performance e mobile

## Owners sugeridos

### Produto e UX

- [ ] definir hierarquia de navegacao
- [ ] definir onboarding
- [ ] revisar nomenclatura
- [ ] revisar dashboard

### Frontend

- [ ] implementar separacao da entrada
- [ ] reorganizar menu
- [ ] simplificar home
- [x] refatorar formularios prioritarios

### Backend

- [x] aplicar migration
- [ ] validar RPCs no ambiente real
- [ ] garantir consistencia das operacoes criticas

### QA e validacao

- [ ] smoke test da entrada
- [ ] smoke test do fluxo React de contas a receber
- [ ] smoke test de navegacao principal
- [ ] smoke test dos fluxos de cadastro prioritarios

## Definicao de pronto do plano

- [ ] entrada clara
- [ ] navegacao mais leve
- [ ] dashboard com foco
- [x] formularios menos cansativos
- [ ] financeiro confiavel
- [ ] produto com menos sinais de improviso e migracao exposta
