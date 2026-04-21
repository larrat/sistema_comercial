# PLANO_FECHAMENTO_BLOCOS_1_A_4_2026-04-21

## Objetivo

Fechar de forma objetiva as pendencias reais dos blocos 1 a 4, separando o que ainda precisa de:

- validacao operacional
- ajuste de arquitetura e clareza
- refinamento final de produto

Este plano assume que a implementacao principal dos blocos 1 a 4 ja foi entregue e que o foco agora e encerramento pratico.

---

## Sprint 1 - Fechamento critico

Meta: tornar o fluxo financeiro e os fluxos principais confiaveis em ambiente real.

### 1. Financeiro real

- [x] validar `rpc_registrar_baixa`
- [x] validar `rpc_estornar_baixa`
- [x] validar `rpc_marcar_conta_pendente`
- [x] validar triggers de:
  - [x] excesso de baixa
  - [x] conta quitada
  - [x] recalculo de saldo
  - [x] recalculo de status
  - [x] recalculo de datas
- [ ] validar backfill de contas antigas

### 2. Smoke test financeiro

- [x] registrar baixa parcial
- [x] receber total
- [x] estornar baixa
- [x] reabrir conta
- [ ] validar detalhe do pedido integrado ao recebimento

### 3. Entrada e onboarding

- [ ] smoke test da entrada
- [ ] smoke test de escolha/criacao de filial
- [ ] validar checklist inicial no primeiro uso
- [ ] revisar se o usuario entende o proximo passo sem apoio interno

### Criterio de encerramento da sprint 1

- [x] financeiro passa confianca em ambiente real
- [ ] entrada nao gera ambiguidade
- [ ] nao ha quebra visivel no fluxo principal de pedidos/recebimento

---

## Sprint 2 - Fechamento estrutural

Meta: reduzir carga cognitiva que ainda impede considerar blocos 1 a 3 como realmente encerrados.

### 1. Menu e arquitetura da informacao

- [ ] reorganizar menu principal em grupos claros:
  - [ ] Inicio
  - [ ] Vendas
  - [ ] Cadastros
  - [ ] Financeiro
  - [ ] Estoque
  - [ ] Marketing
  - [ ] Administracao
- [ ] mover `Filiais` e `Acessos` para contexto administrativo
- [ ] revisar `Gerencial` e `Relatorios` para evitar sobreposicao

### 2. Nomenclatura

- [ ] revisar rotulos ambiguos
- [ ] remover termos internos/tecnicos expostos
- [ ] padronizar nome de modulos, acoes e secoes
- [ ] revisar siglas como `RCA`

### 3. Feedback e estados vazios

- [ ] revisar estados vazios de modulos principais
- [ ] adicionar proximo passo util em cada vazio prioritario
- [ ] revisar mensagens de loading, sucesso e erro
- [ ] revisar confirmacoes de acoes sensiveis

### Criterio de encerramento da sprint 2

- [ ] navegacao exige menos memoria
- [ ] modulos administrativos param de competir com operacionais
- [ ] usuario entende o que fazer quando nao ha dados ou quando algo falha

---

## Sprint 3 - Fechamento operacional

Meta: validar se a experiencia do dia a dia realmente sustenta o que ja foi implementado.

### 1. Smoke test dos fluxos criticos

- [ ] cadastro de produto
- [ ] cadastro de cliente
- [ ] novo pedido
- [ ] baixa parcial
- [ ] importacao

### 2. Responsividade

- [ ] revisar dashboard em telas menores
- [ ] revisar formularios principais em telas menores
- [ ] revisar navegacao compacta

### 3. Ergonomia final de formularios

- [ ] aplicar mascaras onde faltar
- [ ] aplicar defaults/preenchimento inteligente onde for seguro
- [ ] melhorar validacoes inline dos fluxos mais usados

### Criterio de encerramento da sprint 3

- [ ] bloco 4 fica validado alem da implementacao
- [ ] fluxos repetitivos continuam usaveis em telas menores
- [ ] formularios reduzem erro manual de forma perceptivel

---

## Sprint 4 - Refinamento final

Meta: encerrar residual de maturidade visual, performance percebida e acessibilidade.

### 1. Ruido e maturidade

- [ ] remover linguagem restante de transicao
- [ ] remover blocos experimentais ainda expostos
- [ ] reforcar consistencia visual entre modulos

### 2. Performance percebida

- [ ] revisar home para conteudo carregado cedo demais
- [ ] aplicar lazy-load adicional onde fizer sentido
- [ ] revisar loaders e desmontagem de telas ocultas

### 3. Acessibilidade

- [ ] revisar contraste
- [ ] revisar foco por teclado
- [ ] revisar tamanho de clique
- [ ] revisar hierarquia tipografica

### Criterio de encerramento da sprint 4

- [ ] sistema parece produto estavel
- [ ] interface fica mais clara e previsivel
- [ ] blocos 1 a 4 podem ser considerados encerrados de verdade

---

## Ordem recomendada

1. Sprint 1
2. Sprint 2
3. Sprint 3
4. Sprint 4

---

## Definicao objetiva de encerramento dos blocos 1 a 4

Os blocos 1 a 4 so devem ser considerados encerrados quando estas 5 condicoes estiverem verdadeiras:

- [x] financeiro validado em ambiente real
- [ ] menu e arquitetura reorganizados
- [ ] feedback e estados vazios resolvidos nos fluxos principais
- [ ] smoke tests dos fluxos criticos concluidos
- [ ] responsividade principal revisada
