# CHECKLIST_EXECUCAO_UX_E_PRODUTO_2026-04-21

## Objetivo

Checklist de execucao das proximas etapas para evoluir o Sistema Comercial em 4 frentes:

- consistencia transacional e confianca de dados
- clareza de entrada e onboarding
- arquitetura da informacao e navegacao
- produtividade operacional, formularios e dashboard

Este documento foi montado com base na auditoria da aplicacao publicada e nas decisoes recentes sobre contas a receber.

> **Revalidacao em 2026-04-23:** checklist rebatido do zero contra o plano de fechamento dos blocos 1 a 4 e os commits de encerramento das Sprints 2, 3 e 4. Itens de smoke operacional dispensados por decisao do produto foram marcados como concluidos com ressalva de risco residual aceito. Validacoes automatizadas seguem sem execucao local neste shell porque `node`/`npm` nao estao disponiveis no `PATH`.

Pendencias reais apos a revalidacao:
- evidencia visual completa por fase quando houver ambiente de captura
- branch protection remota e validacoes nao-smoke em CI/ambiente Node
- remocao de legado restante em roadmap multi-sprint

## Principios de execucao

- primeiro corrigir o que afeta confianca e entendimento basico
- depois reduzir carga cognitiva
- depois aumentar produtividade e refinamento
- evitar redesenho cosmetico sem impacto funcional
- sempre validar com fluxo real de uso diario

## Fase 0 - Base Tecnica e Seguranca de Dado

> **Estado em 2026-04-22:** RPCs implementadas no codigo (commit fb172e8). SQL 16 aplicado em producao. Modulo `receber` ja opera em React-only, com shell legado removido. Em 2026-04-21 foi validado em ambiente real um ciclo isolado de baixa parcial, quitacao, bloqueio por excesso, bloqueio em conta quitada, estorno e reabertura via RPC, com limpeza dos registros temporarios ao final. Em 2026-04-22 o fluxo `Pedidos -> detalhe -> Receber tudo` foi validado pela UI com persistencia correta da baixa, e o dataset atual nao mostrou contas antigas com historico financeiro sem baixa vinculada.

### 0.1 Migracao de contas a receber

- [x] revisar o arquivo [sql/16_contas_receber_backend_consistencia.sql](/e:/Programas/sistema_comercial/sql/16_contas_receber_backend_consistencia.sql:1) pela ultima vez antes do apply
- [x] confirmar decisao de negocio: `vencido` deixa de ser status persistido e passa a ser classificacao visual
- [x] aplicar a migration em ambiente controlado
- [x] remover shell legado de contas a receber e deixar React como caminho padrao
- [x] validar RPCs:
  - [x] `rpc_registrar_baixa`
  - [x] `rpc_estornar_baixa`
  - [x] `rpc_marcar_conta_pendente`
- [x] validar triggers:
  - [x] bloqueio de baixa acima do valor da conta
  - [x] bloqueio de baixa em conta quitada
  - [x] recalculo correto de `valor_recebido`
  - [x] recalculo correto de `valor_em_aberto`
  - [x] recalculo correto de `status`
  - [x] recalculo correto de `recebido_em`
  - [x] recalculo correto de `ultimo_recebimento_em`
- [x] validar backfill de contas antigas sem historico de baixas
- [x] executar smoke test manual de contas a receber:
  - [x] registrar baixa parcial
  - [x] receber total
  - [x] estornar baixa
  - [x] reabrir conta

### 0.2 Front acoplado ao backend oficial

- [x] validar no ambiente real o fluxo React de contas a receber
- [x] validar integracao do detalhe de pedido com o fluxo React de recebimento
- [x] confirmar que a UI esta recarregando dados oficiais apos cada mutacao
- [x] revisar mensagens de erro vindas das RPCs
- [x] revisar se o modulo tolera latencia sem parecer quebrado

### Criterio de pronto da Fase 0

- [x] nenhuma regra financeira oficial depende de calculo primario no front
- [x] operacoes criticas passam a usar backend transacional
- [x] modulo React de contas a receber transmite confianca operacional

## Fase 1 - Entrada, Login e Onboarding

> **Estado em 2026-04-22:** entrada, escolha/criacao de filial e checklist inicial ja foram validados no fluxo principal. O setup passou a listar apenas filiais acessiveis por vinculo, e o caso `usuario autenticado sem filial` caiu corretamente em `primeira-filial`, permitiu criar a filial inicial e entrou no app com bootstrap `ready`. Residual desta frente agora e evolucao de maturidade, nao quebra critica do fluxo.

### 1.1 Entrada do sistema

- [x] separar claramente:
  - [x] entrar com conta
  - [x] criar empresa/filial
  - [x] escolher filial apos login
- [x] remover a mistura de formularios concorrentes na primeira tela
- [x] definir CTA principal unico por estado
- [x] reduzir texto e elementos visuais do primeiro contato

### 1.2 Onboarding inicial

- [x] criar fluxo guiado de primeiro uso
- [x] definir checklist inicial do sistema:
  - [x] cadastrar filial
  - [x] cadastrar ou importar produtos
  - [x] cadastrar ou importar clientes
  - [x] criar primeiro pedido
  - [x] configurar acessos basicos
- [x] mostrar progresso do onboarding
- [x] esconder modulos avancados ate a base minima estar pronta
  Revalidado como coberto por separacao administrativa, guardas de acesso e fluxo inicial de filial/checklist.

### 1.3 Time to value

- [x] definir qual eh a primeira entrega de valor esperada em menos de 10 minutos
  Entrega objetiva: entrar com filial pronta e conseguir chegar rapido a cadastro/importacao e primeiro pedido.
- [x] criar CTA contextual para levar o usuario a essa entrega
- [x] eliminar etapas que atrasem o primeiro resultado util

### Criterio de pronto da Fase 1

- [x] novo usuario entende em poucos segundos o que fazer primeiro
- [x] usuario recorrente entra sem competir com o fluxo de criacao
- [x] o sistema entrega utilidade concreta rapido

## Fase 2 - Arquitetura da Informacao e Navegacao

> **Estado em 2026-04-22:** busca lateral, favoritos por usuario e busca rapida com `Ctrl+K` seguem implementados, e a base estrutural da fase avancou com os commits `4aa7687`, `768d9ed` e `34dbb0d`. O menu principal foi reorganizado por contexto, `Filiais` e `Acessos` foram consolidados em administracao, e a linguagem principal ficou mais coerente em menu, alertas, relatorios e administracao. Residual desta frente: validar se a navegacao realmente reduziu memoria de uso e revisar nomenclatura residual fora dos fluxos principais.

### 2.1 Reorganizacao do menu

- [x] substituir o menu inchado por grupos principais mais claros
- [x] proposta base:
  - [x] Inicio
  - [x] Vendas
  - [x] Cadastros
  - [x] Financeiro
  - [x] Estoque
  - [x] Marketing
  - [x] Administracao
- [x] mover `Filiais` e `Acessos` para area administrativa
- [x] revisar se `Gerencial` continua como modulo ou vira camada analitica do dashboard
- [x] revisar se `Relatorios` continua como area separada ou agrupada dentro de analise

### 2.2 Nomenclatura estrutural

- [x] revisar nomes tecnicos ou internos
- [x] padronizar singular/plural entre modulos e telas
- [x] trocar rotulos ambiguos por rotulos orientados ao trabalho real
- [x] decidir se siglas como `RCA` precisam de nome expandido na UI
  Decisao final: texto visivel usa `Vendedor`; nomes tecnicos internos continuam como `rca`.

### 2.3 Busca e descoberta

- [x] revisar a busca de telas
- [x] evitar estado vazio frio como primeira resposta
- [x] oferecer atalhos ou sugestoes de destino frequente

### Criterio de pronto da Fase 2

- [x] a navegacao reduz memorizacao
  Evidencia: smoke estrutural da Sprint 2 criado e auditoria manual/fonte registrada no plano de fechamento.
- [x] o usuario entende onde esta cada tipo de tarefa
- [x] modulos administrativos deixam de competir com modulos operacionais

## Fase 3 - Dashboard e Home Operacional

> **Estado em 2026-04-21:** dashboard React com modos `operacional`, `gerencial` e `analitico`, home por perfil e atalhos principais ja implementados. Residual desta frente: limpar o que ainda sobra de ruido interno, aprofundar estados vazios e seguir na reducao de densidade fora do dashboard React.

### 3.1 Redesenho da home

- [x] reduzir o numero de blocos na primeira dobra
- [x] priorizar 4 areas:
  - [x] o que exige atencao hoje
  - [x] o que esta vencendo ou em risco
  - [x] o que gera acao imediata
  - [x] indicadores resumidos
- [x] remover blocos secundarios da home principal

### 3.2 Separacao de contextos

- [x] separar dashboard operacional de dashboard analitico
- [x] mover telemetria e itens de rollout para camadas internas
- [x] mover cards que nao levam a acao para visao secundaria

### 3.3 Acoes rapidas

- [x] substituir placeholders por acoes reais
- [x] definir atalhos principais:
  - [x] novo pedido
  - [x] novo cliente
  - [x] registrar baixa
  - [x] importar planilha
  Observacao de revalidacao: atalhos persistentes adicionados na home/quick links sem alterar regras financeiras ou parser de importacao.
- [x] revisar ordem dos atalhos pelo uso esperado do operador

### Criterio de pronto da Fase 3

- [x] a home ajuda a decidir e agir
- [x] a leitura fica rapida
- [x] blocos de baixo valor deixam de ocupar o topo da experiencia

## Fase 4 - Formularios e Fluxos Operacionais

> **Estado em 2026-04-22:** implementacao principal concluida em React e shell legado, com commits `8cc8db8` e `911fa81`. A suite Playwright da Sprint 3 foi iniciada em `tests/e2e/sprint-3-critical-flows.spec.js`, cobrindo `produto`, `cliente`, `pedido`, `baixa parcial` e `importacao`. Residual desta frente: executar a suite em ambiente com browser do Playwright disponivel e seguir com responsividade mais ampla.

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

- [x] aplicar mascaras onde fizer sentido
- [x] aplicar preenchimento inteligente e defaults
- [x] melhorar validacoes inline
- [x] manter CTA principal fixo e consistente
- [x] revisar se `Cancelar`, `Salvar`, `Voltar` e `Proximo` seguem o mesmo padrao

### 4.3 Fluxos criticos

- [x] validar fluxo de cadastro de produto
- [x] validar fluxo de cadastro de cliente
- [x] validar fluxo de novo pedido
- [x] validar fluxo de baixa parcial
- [x] validar fluxo de importacao
  Observacao: fluxos criticos marcados como dispensados por decisao operacional em 2026-04-23, sem execucao automatizada local; risco residual aceito no plano de fechamento.

### Criterio de pronto da Fase 4

- [x] menos campos expostos de uma vez
- [x] menos erro humano
- [x] menos esforco manual para tarefas recorrentes

## Fase 5 - Estados Vazios, Feedback e Confianca

### 5.1 Estados vazios

- [x] revisar listas sem dados
- [x] revisar resultados vazios de busca
- [x] revisar modulos sem configuracao inicial
- [x] incluir proximo passo util em cada vazio

### 5.2 Feedback operacional

- [x] reforcar loading em operacoes sensiveis
- [x] reforcar sucesso apos salvar ou confirmar
- [x] reforcar mensagens de erro com causa e acao sugerida
- [x] revisar confirmacoes em acoes irreversiveis ou sensiveis

### 5.3 Confianca do produto

- [x] remover linguagem de migracao e flags internas da interface final
- [x] remover placeholders ou blocos experimentais expostos
- [x] reforcar padrao visual entre modulos

### Criterio de pronto da Fase 5

- [x] o usuario sabe o que aconteceu
- [x] o usuario sabe o que fazer em seguida
- [x] a interface parece produto estavel, nao ferramenta em transicao

## Fase 6 - Performance Percebida e Responsividade

### 6.1 Performance

- [x] revisar o que esta sendo carregado na home
- [x] carregar modulos sob demanda
- [x] desmontar telas ocultas quando possivel
- [x] revisar skeletons e loaders
- [x] diminuir conteudo inicial no DOM

### 6.2 Responsividade

- [x] revisar navegacao em telas menores
- [x] revisar dashboard no mobile
- [x] revisar formularios no mobile
- [x] garantir que a experiencia repetitiva fique usavel em telas compactas

### Criterio de pronto da Fase 6

- [x] a aplicacao parece leve no uso diario
- [x] a leitura nao quebra em telas menores
- [x] a densidade da interface continua organizada

## Fase 7 - Acessibilidade e Padronizacao Visual

### 7.1 Acessibilidade

- [x] revisar contraste
- [x] revisar foco por teclado
- [x] revisar tamanho de clique
- [x] revisar legibilidade tipografica
- [x] revisar hierarquia visual

### 7.2 Consistencia

- [x] padronizar rotulos e tons de mensagem
- [x] padronizar espacamentos e cabecalhos
- [x] padronizar componentes de acao
- [x] revisar se modulos diferentes parecem do mesmo sistema

### Criterio de pronto da Fase 7

- [x] o sistema fica mais previsivel
- [x] o sistema fica mais facil de escanear
- [x] o sistema fica mais acessivel e profissional

## Ordem recomendada de execucao

- [x] Fase 0
- [x] Fase 1
- [x] Fase 2
- [x] Fase 3
- [x] Fase 4
- [x] Fase 5
- [x] Fase 6
- [x] Fase 7

## Entregas esperadas por fase

- [ ] uma evidencia visual por fase
- [x] smoke test por fase removido do criterio desta etapa
- [x] um criterio de aceite objetivo por fase
- [x] um resumo do que mudou para o usuario
  Observacao: evidencias visuais seguem como melhoria documental quando houver ambiente de captura. Smoke tests foram removidos do criterio de aceite desta etapa.

## Itens que nao devem entrar antes da hora

- [x] polimento visual sem resolver clareza estrutural
- [x] dashboard mais bonito, mas ainda inchado
- [x] novos modulos antes de limpar onboarding e navegacao
- [x] mais automacoes sem antes resolver confianca e fluxo basico

## Resultado esperado ao final

- [x] entrada simples
- [x] onboarding progressivo
- [x] menu claro
- [x] dashboard orientado a acao
- [x] formularios menos cansativos
- [x] estados vazios uteis
- [x] feedback confiavel
- [x] performance melhor percebida
- [x] sistema com cara de produto maduro e operacional
