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
- [x] validar backfill de contas antigas
  Observacao em 2026-04-22:
  o dataset atual nao apresentou contas com historico financeiro sem baixa associada.
  Foram identificadas 2 contas com historico de recebimento e 0 casos residuais sem baixa.
  Nao houve ocorrencia de backfill pendente no ambiente validado.

### 2. Smoke test financeiro

- [x] registrar baixa parcial
- [x] receber total
- [x] estornar baixa
- [x] reabrir conta
- [x] validar detalhe do pedido integrado ao recebimento
  Observacao em 2026-04-22:
  `Pedidos -> detalhe -> Receber tudo` concluiu a baixa pela UI, recarregou a conta do backend e persistiu `status=recebido`, `valor_recebido`, `valor_em_aberto=0` e a baixa vinculada.

### 3. Entrada e onboarding

- [x] smoke test da entrada
- [x] smoke test de escolha/criacao de filial
- [x] validar checklist inicial no primeiro uso
- [x] revisar se o usuario entende o proximo passo sem apoio interno
  Observacao em 2026-04-22:
  o setup passou a listar apenas filiais acessiveis por vinculo.
  O caso de usuario autenticado sem vinculo caiu corretamente em `primeira-filial`, permitiu criar a filial inicial e entrou no app com bootstrap `ready`.
  O checklist e os textos de apoio deixaram claro o proximo passo sem apoio interno.

### Criterio de encerramento da sprint 1

- [x] financeiro passa confianca em ambiente real
- [x] entrada nao gera ambiguidade
- [x] nao ha quebra visivel no fluxo principal de pedidos/recebimento

### Resultado

- [x] sprint 1 concluida em 2026-04-22

---

## Sprint 2 - Fechamento estrutural

Meta: reduzir carga cognitiva que ainda impede considerar blocos 1 a 3 como realmente encerrados.

Status em 2026-04-22:
- commits `4aa7687`, `768d9ed` e `34dbb0d` ja entregaram a base estrutural da Sprint 2
- menu principal foi reorganizado por contexto
- `Filiais` e `Acessos` foram consolidados no contexto administrativo
- nomenclatura principal e feedbacks mais visiveis avancaram
- residual atual: validar se a nova arquitetura realmente reduz memoria de navegacao no uso diario e revisar o que ainda sobra de rotulos internos fora dos fluxos principais

### 1. Menu e arquitetura da informacao

- [x] reorganizar menu principal em grupos claros:
  - [x] Inicio
  - [x] Vendas
  - [x] Cadastros
  - [x] Financeiro
  - [x] Estoque
  - [x] Marketing
  - [x] Administracao
- [x] mover `Filiais` e `Acessos` para contexto administrativo
- [x] revisar `Gerencial` e `Relatorios` para evitar sobreposicao
  Observacao em 2026-04-22:
  a navegacao passou a separar `Analises` de `Relatorios`, com grupos principais claros e menos competicao entre areas operacionais e administrativas.

### 2. Nomenclatura

- [x] revisar rotulos ambiguos
- [x] remover termos internos/tecnicos expostos
- [x] padronizar nome de modulos, acoes e secoes
- [ ] revisar siglas como `RCA`
  Observacao em 2026-04-22:
  foram alinhados rotulos como `Início`, `Analises`, `Compras`, `Alertas e pendencias` e `Acessos e permissoes`.
  O residual de nomenclatura agora esta concentrado em siglas e pontos mais profundos da operacao.

### 3. Feedback e estados vazios

- [x] revisar estados vazios de modulos principais
- [x] adicionar proximo passo util em cada vazio prioritario
- [x] revisar mensagens de loading, sucesso e erro
- [x] revisar confirmacoes de acoes sensiveis
  Observacao em 2026-04-22:
  houve revisao pratica em compras, estoque, contas a receber, alertas e administracao, com mensagens mais guiadas e confirmacoes menos secas.
  Ainda vale ampliar esse padrao para modulos secundarios em sprint posterior, mas o nucleo da Sprint 2 ja foi coberto.

### Criterio de encerramento da sprint 2

- [ ] navegacao exige menos memoria
- [x] modulos administrativos param de competir com operacionais
- [x] usuario entende o que fazer quando nao ha dados ou quando algo falha

### Residual para encerramento formal

- [ ] validar por smoke/manual se a nova navegacao realmente reduziu memorizacao no uso recorrente
- [ ] revisar rotulos restantes fora do fluxo principal, com foco em siglas e textos mais profundos de analise

---

## Sprint 3 - Fechamento operacional

Meta: validar se a experiencia do dia a dia realmente sustenta o que ja foi implementado.

Status em 2026-04-22:
- suite Playwright da Sprint 3 criada em `tests/e2e/sprint-3-critical-flows.spec.js`
- cobertura inicial preparada para `produto`, `cliente`, `pedido`, `baixa parcial` e `importacao`
- infraestrutura local ainda bloqueia a execucao real: o Chromium do Playwright nao esta instalado nesta maquina e o download automatico falhou por timeout no CDN
- proximo passo desta sprint: instalar o browser ou reaproveitar um binario local e rodar a suite com as variaveis `E2E_*`

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
