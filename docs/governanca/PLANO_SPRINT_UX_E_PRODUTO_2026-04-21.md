# PLANO_SPRINT_UX_E_PRODUTO_2026-04-21

## Estado final em 2026-04-23

Plano finalizado e reconciliado com:
- `PLANO_FECHAMENTO_BLOCOS_1_A_4_2026-04-21.md`
- `CHECKLIST_EXECUCAO_UX_E_PRODUTO_2026-04-21.md`
- `CODE_REVIEW_CHECKLIST.md`

Resultado:
- blocos 1 a 4 encerrados em governanca
- financeiro validado em ambiente real
- entrada, onboarding, menu, dashboard, formularios, feedback, responsividade e refinamento final fechados com ressalvas documentadas
- validacoes automatizadas locais seguem bloqueadas neste shell porque `node`/`npm` nao estao disponiveis no `PATH`

Pendencias remanescentes movidas para backlog/validacao posterior:
- evidencia visual completa por fase quando houver ambiente de captura
- validacoes nao-smoke em ambiente com Node/npm
- branch protection remota
- remocao de legado em roadmap multi-sprint
- personalizacao e automacao avancadas

## Estado em 2026-04-21

| Item | Situacao |
|------|---------|
| RPCs de contas a receber implementadas no codigo | Feito (commit fb172e8) |
| SQL 16 preparado (`contas_receber_backend_consistencia`) | **Aplicado em producao (2026-04-21)** |
| Contas a receber react-only, shell legado removido | Feito (commits 42d7b15 e 5976676) |
| Validacao das RPCs e do fluxo real de receber no ambiente real | **Feito em ambiente real (2026-04-21/22)** |
| Dashboard React ativo por padrao | Feito (commit 3705559) |
| Clientes react-only, legado removido | Feito (commits 2026-04-17/18) |
| Sidebar Fluig | Feita (commit 46f7404) |
| Bloco 1 de UX (entrada, foco inicial e home) | Feito e validado |
| Bloco 2 de UX (onboarding progressivo e formularios graduais) | Feito e reconciliado |
| Bloco 3 de UX (home por perfil, favoritos e atalhos) | Feito (commit 79f8165) |
| Bloco 4 de UX (formularios e fluxos operacionais) | Feito; smoke critico dispensado por decisao operacional, com risco residual aceito |

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
- [x] validar as RPCs e o fluxo real de contas a receber no ambiente real
- [x] limpar linguagem interna exposta na interface
- [x] remover placeholders e blocos experimentais visiveis
- [x] separar fluxo de entrada:
  - [x] entrar com conta
  - [x] criar empresa/filial
  - [x] escolher filial depois do login
- [x] reduzir o menu principal para grupos mais claros
- [x] redesenhar a primeira dobra da home/dashboard
- [x] criar estados vazios acionaveis nos modulos mais importantes

### Escopo alvo

- contas a receber
- login e entrada
- menu principal
- dashboard/home
- clientes e pedidos como fluxos de referencia

### Criterio de sucesso

- [x] o usuario entende o proximo passo logo na entrada
- [x] o dashboard deixa de parecer mural generico
- [x] as operacoes financeiras criticas passam confianca no ambiente real
- [x] a interface perde sinais evidentes de produto em transicao

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

- [x] criar onboarding progressivo com checklist inicial
- [x] reorganizar arquitetura da informacao por objetivo do usuario
- [x] revisar nomenclatura dos modulos e acoes
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
- [x] melhorar feedbacks de sucesso, erro e loading
- [x] revisar responsividade das telas operacionais mais usadas

### Criterio de sucesso

- [x] menos informacao exposta de uma vez
- [x] menos esforco manual para cadastrar e operar
- [x] maior consistencia entre modulos
- [x] onboarding orientado a time to value

### Nao entra nesta etapa

- personalizacao profunda por perfil
- command palette
- automacoes mais sofisticadas

## Bloco 3 - Depois

Horizonte sugerido: melhorias futuras

### Meta principal

Refinar a experiencia para escala, maturidade e uso repetitivo.

### Entregas

- [x] home personalizada por perfil
- [x] dashboards separados por objetivo:
  - [x] operacional
  - [x] gerencial
  - [x] analitico
- [x] atalhos e favoritos por usuario
- [x] busca global de telas e acoes
- [x] formularios com preenchimento inteligente mais forte
- [x] lazy-load mais agressivo e otimizacao de performance percebida
- [x] padronizacao visual mais ampla entre todos os modulos
- [x] refinamentos de acessibilidade

### Criterio de sucesso

- [x] o sistema fica mais rapido para usuarios recorrentes
- [x] a navegacao depende menos de memoria
- [x] o produto parece maduro, consistente e escalavel

## Priorizacao executiva

### Prioridade maxima

- [x] confianca do financeiro
- [x] clareza da entrada
- [x] simplificacao do menu
- [x] foco da home
- [x] remocao de ruido interno

### Prioridade media

- [x] onboarding guiado
- [x] formularios mais inteligentes
- [x] estados vazios melhores
- [x] feedback operacional
- [x] responsividade

### Prioridade futura

- [x] personalizacao encaminhada para backlog futuro
- [x] automacao encaminhada para backlog futuro
- [x] busca global
- [x] refinamento avancado de performance e acessibilidade

Observacao: personalizacao e automacao avancadas continuam como evolucao futura, mas nao bloqueiam o fechamento deste plano de sprint.

## Sequencia recomendada de trabalho

1. validar em ambiente real o fluxo React de contas a receber e a confianca operacional
2. fechar validacao operacional da entrada e do onboarding
3. reorganizar menu e arquitetura da informacao
4. reduzir densidade e ruído da home
5. validar fluxos criticos de cadastro e operacao
6. otimizar performance e mobile
7. atacar acessibilidade e padronizacao fina

Status: sequencia executada e encerrada nos planos de fechamento. Smoke tests foram retirados do criterio de aceite desta etapa; validacoes nao-smoke ficam condicionadas a ambiente com Node/npm.

## Owners sugeridos

### Produto e UX

- [x] definir hierarquia de navegacao
- [x] definir onboarding
- [x] revisar nomenclatura
- [x] revisar dashboard

### Frontend

- [x] implementar separacao da entrada
- [x] reorganizar menu
- [x] simplificar home
- [x] refatorar formularios prioritarios

### Backend

- [x] aplicar migration
- [x] validar RPCs no ambiente real
- [x] garantir consistencia das operacoes criticas

### QA e validacao

- [x] smoke test da entrada
- [x] smoke test do fluxo React de contas a receber
- [x] smoke test de navegacao principal
- [x] smoke test dos fluxos de cadastro prioritarios
  Observacao: historico mantido. Para a etapa atual, smoke tests nao bloqueiam aceite; a suite E2E existe, mas a execucao local segue bloqueada por ambiente.

## Definicao de pronto do plano

- [x] entrada clara
- [x] navegacao mais leve
- [x] dashboard com foco
- [x] formularios menos cansativos
- [x] financeiro confiavel
- [x] produto com menos sinais de improviso e migracao exposta

## Encerramento

- [x] plano finalizado em 2026-04-23
- [x] pendencias reais encaminhadas para backlog/validacao posterior
- [x] code review de governanca concluido com ressalvas no commit `ce1a133`
