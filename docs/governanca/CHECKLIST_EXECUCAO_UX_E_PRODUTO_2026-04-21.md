# CHECKLIST_EXECUCAO_UX_E_PRODUTO_2026-04-21

## Objetivo

Checklist de execucao das proximas etapas para evoluir o Sistema Comercial em 4 frentes:

- consistencia transacional e confianca de dados
- clareza de entrada e onboarding
- arquitetura da informacao e navegacao
- produtividade operacional, formularios e dashboard

Este documento foi montado com base na auditoria da aplicacao publicada e nas decisoes recentes sobre contas a receber.

## Principios de execucao

- primeiro corrigir o que afeta confianca e entendimento basico
- depois reduzir carga cognitiva
- depois aumentar produtividade e refinamento
- evitar redesenho cosmetico sem impacto funcional
- sempre validar com fluxo real de uso diario

## Fase 0 - Base Tecnica e Seguranca de Dado

> **Estado em 2026-04-21:** RPCs implementadas no codigo (commit fb172e8). SQL 16 aplicado em producao. Modulo `receber` ja opera em React-only, com shell legado removido. Pendente: validacao operacional no ambiente real.

### 0.1 Migracao de contas a receber

- [x] revisar o arquivo [sql/16_contas_receber_backend_consistencia.sql](/e:/Programas/sistema_comercial/sql/16_contas_receber_backend_consistencia.sql:1) pela ultima vez antes do apply
- [x] confirmar decisao de negocio: `vencido` deixa de ser status persistido e passa a ser classificacao visual
- [x] aplicar a migration em ambiente controlado
- [x] remover shell legado de contas a receber e deixar React como caminho padrao
- [ ] validar RPCs:
  - [ ] `rpc_registrar_baixa`
  - [ ] `rpc_estornar_baixa`
  - [ ] `rpc_marcar_conta_pendente`
- [ ] validar triggers:
  - [ ] bloqueio de baixa acima do valor da conta
  - [ ] bloqueio de baixa em conta quitada
  - [ ] recálculo correto de `valor_recebido`
  - [ ] recálculo correto de `valor_em_aberto`
  - [ ] recálculo correto de `status`
  - [ ] recálculo correto de `recebido_em`
  - [ ] recálculo correto de `ultimo_recebimento_em`
- [ ] validar backfill de contas antigas sem historico de baixas
- [ ] executar smoke test manual de contas a receber:
  - [ ] registrar baixa parcial
  - [ ] receber total
  - [ ] estornar baixa
  - [ ] reabrir conta

### 0.2 Front acoplado ao backend oficial

- [ ] validar no ambiente real o fluxo React de contas a receber
- [ ] validar integracao do detalhe de pedido com o fluxo React de recebimento
- [ ] confirmar que a UI esta recarregando dados oficiais apos cada mutacao
- [ ] revisar mensagens de erro vindas das RPCs
- [ ] revisar se o modulo tolera latencia sem parecer quebrado

### Criterio de pronto da Fase 0

- [ ] nenhuma regra financeira oficial depende de calculo primario no front
- [ ] operacoes criticas passam a usar backend transacional
- [ ] modulo React de contas a receber transmite confianca operacional

## Fase 1 - Entrada, Login e Onboarding

### 1.1 Entrada do sistema

- [ ] separar claramente:
  - [ ] entrar com conta
  - [ ] criar empresa/filial
  - [ ] escolher filial apos login
- [ ] remover a mistura de formularios concorrentes na primeira tela
- [ ] definir CTA principal unico por estado
- [ ] reduzir texto e elementos visuais do primeiro contato

### 1.2 Onboarding inicial

- [ ] criar fluxo guiado de primeiro uso
- [ ] definir checklist inicial do sistema:
  - [ ] cadastrar filial
  - [ ] cadastrar ou importar produtos
  - [ ] cadastrar ou importar clientes
  - [ ] criar primeiro pedido
  - [ ] configurar acessos basicos
- [ ] mostrar progresso do onboarding
- [ ] esconder modulos avancados ate a base minima estar pronta

### 1.3 Time to value

- [ ] definir qual eh a primeira entrega de valor esperada em menos de 10 minutos
- [ ] criar CTA contextual para levar o usuario a essa entrega
- [ ] eliminar etapas que atrasem o primeiro resultado util

### Criterio de pronto da Fase 1

- [ ] novo usuario entende em poucos segundos o que fazer primeiro
- [ ] usuario recorrente entra sem competir com o fluxo de criacao
- [ ] o sistema entrega utilidade concreta rapido

## Fase 2 - Arquitetura da Informacao e Navegacao

### 2.1 Reorganizacao do menu

- [ ] substituir o menu inchado por grupos principais mais claros
- [ ] proposta base:
  - [ ] Inicio
  - [ ] Vendas
  - [ ] Cadastros
  - [ ] Financeiro
  - [ ] Estoque
  - [ ] Marketing
  - [ ] Administracao
- [ ] mover `Filiais` e `Acessos` para area administrativa
- [ ] revisar se `Gerencial` continua como modulo ou vira camada analitica do dashboard
- [ ] revisar se `Relatorios` continua como area separada ou agrupada dentro de analise

### 2.2 Nomenclatura estrutural

- [ ] revisar nomes tecnicos ou internos
- [ ] padronizar singular/plural entre modulos e telas
- [ ] trocar rotulos ambiguos por rotulos orientados ao trabalho real
- [ ] decidir se siglas como `RCA` precisam de nome expandido na UI

### 2.3 Busca e descoberta

- [ ] revisar a busca de telas
- [ ] evitar estado vazio frio como primeira resposta
- [ ] oferecer atalhos ou sugestoes de destino frequente

### Criterio de pronto da Fase 2

- [ ] a navegacao reduz memorizacao
- [ ] o usuario entende onde esta cada tipo de tarefa
- [ ] modulos administrativos deixam de competir com modulos operacionais

## Fase 3 - Dashboard e Home Operacional

### 3.1 Redesenho da home

- [ ] reduzir o numero de blocos na primeira dobra
- [ ] priorizar 4 areas:
  - [ ] o que exige atencao hoje
  - [ ] o que esta vencendo ou em risco
  - [ ] o que gera acao imediata
  - [ ] indicadores resumidos
- [ ] remover blocos secundarios da home principal

### 3.2 Separacao de contextos

- [ ] separar dashboard operacional de dashboard analitico
- [ ] mover telemetria e itens de rollout para camadas internas
- [ ] mover cards que nao levam a acao para visao secundaria

### 3.3 Acoes rapidas

- [ ] substituir placeholders por acoes reais
- [ ] definir atalhos principais:
  - [ ] novo pedido
  - [ ] novo cliente
  - [ ] registrar baixa
  - [ ] importar planilha
- [ ] revisar ordem dos atalhos pelo uso esperado do operador

### Criterio de pronto da Fase 3

- [ ] a home ajuda a decidir e agir
- [ ] a leitura fica rapida
- [ ] blocos de baixo valor deixam de ocupar o topo da experiencia

## Fase 4 - Formularios e Fluxos Operacionais

> **Estado em 2026-04-21:** implementacao principal concluida em React e shell legado, com commits `8cc8db8` e `911fa81`. Residual desta frente: smoke tests operacionais e responsividade mais ampla.

### 4.1 Formularios principais

- [x] revisar formularios de:
  - [x] produto
  - [x] cliente
  - [x] campanha
  - [x] filial
  - [x] pedido
  - [x] contas a receber
- [x] separar campos obrigatorios de campos avancados
- [x] reduzir trabalho manual no primeiro preenchimento
- [x] revisar ordem dos campos por logica operacional

### 4.2 Ergonomia de preenchimento

- [ ] aplicar mascaras onde fizer sentido
- [ ] aplicar preenchimento inteligente e defaults
- [ ] melhorar validacoes inline
- [x] manter CTA principal fixo e consistente
- [x] revisar se `Cancelar`, `Salvar`, `Voltar` e `Proximo` seguem o mesmo padrao

### 4.3 Fluxos criticos

- [ ] validar fluxo de cadastro de produto
- [x] validar fluxo de cadastro de cliente
- [ ] validar fluxo de novo pedido
- [ ] validar fluxo de baixa parcial
- [ ] validar fluxo de importacao

### Criterio de pronto da Fase 4

- [x] menos campos expostos de uma vez
- [x] menos erro humano
- [x] menos esforco manual para tarefas recorrentes

## Fase 5 - Estados Vazios, Feedback e Confianca

### 5.1 Estados vazios

- [ ] revisar listas sem dados
- [ ] revisar resultados vazios de busca
- [ ] revisar modulos sem configuracao inicial
- [ ] incluir proximo passo util em cada vazio

### 5.2 Feedback operacional

- [ ] reforcar loading em operacoes sensiveis
- [ ] reforcar sucesso apos salvar ou confirmar
- [ ] reforcar mensagens de erro com causa e acao sugerida
- [ ] revisar confirmacoes em acoes irreversiveis ou sensiveis

### 5.3 Confianca do produto

- [ ] remover linguagem de migracao e flags internas da interface final
- [ ] remover placeholders ou blocos experimentais expostos
- [ ] reforcar padrao visual entre modulos

### Criterio de pronto da Fase 5

- [ ] o usuario sabe o que aconteceu
- [ ] o usuario sabe o que fazer em seguida
- [ ] a interface parece produto estavel, nao ferramenta em transicao

## Fase 6 - Performance Percebida e Responsividade

### 6.1 Performance

- [ ] revisar o que esta sendo carregado na home
- [ ] carregar modulos sob demanda
- [ ] desmontar telas ocultas quando possivel
- [ ] revisar skeletons e loaders
- [ ] diminuir conteudo inicial no DOM

### 6.2 Responsividade

- [ ] revisar navegacao em telas menores
- [ ] revisar dashboard no mobile
- [ ] revisar formularios no mobile
- [ ] garantir que a experiencia repetitiva fique usavel em telas compactas

### Criterio de pronto da Fase 6

- [ ] a aplicacao parece leve no uso diario
- [ ] a leitura nao quebra em telas menores
- [ ] a densidade da interface continua organizada

## Fase 7 - Acessibilidade e Padronizacao Visual

### 7.1 Acessibilidade

- [ ] revisar contraste
- [ ] revisar foco por teclado
- [ ] revisar tamanho de clique
- [ ] revisar legibilidade tipografica
- [ ] revisar hierarquia visual

### 7.2 Consistencia

- [ ] padronizar rotulos e tons de mensagem
- [ ] padronizar espacamentos e cabecalhos
- [ ] padronizar componentes de acao
- [ ] revisar se modulos diferentes parecem do mesmo sistema

### Criterio de pronto da Fase 7

- [ ] o sistema fica mais previsivel
- [ ] o sistema fica mais facil de escanear
- [ ] o sistema fica mais acessivel e profissional

## Ordem recomendada de execucao

- [ ] Fase 0
- [ ] Fase 1
- [ ] Fase 2
- [ ] Fase 3
- [x] Fase 4
- [ ] Fase 5
- [ ] Fase 6
- [ ] Fase 7

## Entregas esperadas por fase

- [ ] uma evidencia visual por fase
- [ ] um smoke test por fase
- [ ] um criterio de aceite objetivo por fase
- [ ] um resumo do que mudou para o usuario

## Itens que nao devem entrar antes da hora

- [ ] polimento visual sem resolver clareza estrutural
- [ ] dashboard mais bonito, mas ainda inchado
- [ ] novos modulos antes de limpar onboarding e navegacao
- [ ] mais automacoes sem antes resolver confianca e fluxo basico

## Resultado esperado ao final

- [ ] entrada simples
- [ ] onboarding progressivo
- [ ] menu claro
- [ ] dashboard orientado a acao
- [x] formularios menos cansativos
- [ ] estados vazios uteis
- [ ] feedback confiavel
- [ ] performance melhor percebida
- [ ] sistema com cara de produto maduro e operacional
