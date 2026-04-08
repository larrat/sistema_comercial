# Roadmap de Execucao Tecnica

Data base: 2026-04-08  
Perfil: Staff / Principal Engineering  
Escopo: seguranca, saneamento arquitetural, governanca, confiabilidade e escalabilidade

## 1. Resumo Executivo

### Leitura geral
O sistema esta funcional e evoluiu bem no frontend, mas continua operando com risco estrutural alto porque:
- o browser ainda concentra regra critica
- o cliente acessa o banco diretamente via Supabase/PostgREST
- a governanca de schema, seguranca e release ainda depende mais de disciplina manual do que de enforcement tecnico

### Prioridade maxima
Conter risco de seguranca e impedir que a base continue crescendo em cima de padroes errados.

### Ordem real de execucao
1. Contencao imediata de seguranca e ambiente
2. Estabilizacao obrigatoria de contratos, schema e testes minimos
3. Consolidacao de backend de dominio e reducao de regra critica no frontend
4. Observabilidade, CI/CD e governanca continua

### Maior risco de nao agir agora
Incidente de seguranca, regressao silenciosa de comportamento entre ambientes e continuidade de crescimento tecnico sem controle.

### Ponto mais sensivel da base
`src/app/api.js`, porque hoje concentra configuracao de ambiente, sessao, transporte, fallback de schema e parte da regra de negocio.

---

## 1A. Fases de Execucao

### Fase 1 - Contencao e Hardening Inicial
- status: em andamento
- foco:
  - endurecer configuracao de ambiente
  - bloquear fallback estrutural no cliente
  - congelar caminhos inseguros de RLS
  - preparar checklist operacional da primeira onda

### Fase 2 - Estabilizacao Obrigatoria
- status: em andamento
- foco:
  - contratos minimos da camada `SB.*`
  - smoke tests dos fluxos criticos
  - falha explicita de persistencia
  - reforco de autorizacao funcional
  - primeira onda backend (`script first`) preparada com runner unico

### Fase 3 - Backend de Dominio
- status: planejada
- foco:
  - Edge Functions / BFF
  - services por dominio
  - reducao da regra critica no frontend
  - agregacoes e validacoes no backend

### Fase 4 - Governanca Continua
- status: planejada
- foco:
  - observabilidade operacional
  - CI/CD e gates
  - ownership por dominio
  - governanca continua de schema, release e frontend

---

## 2. Plano de Acao por Prioridade

## Prioridade 0 - Contencao Imediata

### Objetivo
Reduzir risco critico e interromper crescimento inseguro.

### Problemas atacados
- backend inexistente como camada de dominio
- configuracao de seguranca ambigua entre dev e prod
- fallback local mascarando falha de persistencia
- drift de schema tolerado no cliente

### Acoes concretas
- Congelar uso de `sql/01b_rls_anon_dev.sql` fora de ambiente de desenvolvimento explicitamente controlado
- Validar producao somente com:
  - `sql/02_rls_producao.sql`
  - `sql/03_rbac_v1.sql`
  - `sql/04_rbac_v2_admin_only.sql`
  - `sql/05_rbac_auditoria_acessos.sql`
- Remover defaults sensiveis hardcoded de `src/app/api.js`
- Proibir novos fallbacks estruturais no cliente para schema e persistencia
- Criar checklist de ambiente obrigatorio para release

### Responsaveis sugeridos
- DBA / Supabase Owner
- Backend Lead
- DevOps / SRE

### Dependencias
- acesso administrativo ao Supabase
- definicao formal de ambientes dev, homolog e prod

### Risco de regressao
Medio

### Criterio de aceite
- nenhum ambiente produtivo operando com politica `anon` aberta
- sem URL/chave default embutida como fallback operacional
- checklist de ambiente assinado antes de release

## Prioridade 1 - Estabilizacao Obrigatoria

### Objetivo
Diminuir fragilidade operacional e criar base minima de previsibilidade.

### Problemas atacados
- ausencia de testes automatizados
- contratos nao versionados e sem schema enforcement
- autorizacao visual fragil
- estado global mutavel e acoplado

### Acoes concretas
- Criar smoke tests dos fluxos criticos:
  - login
  - setup de filial
  - criar/editar pedido
  - criar campanha e gerar fila
  - tela admin de acessos
- Bloquear fallback de schema em `src/app/api.js`
- Criar contrato minimo de erro/resposta para camada `SB.*`
- Reforcar autorizacao funcional, nao apenas visual
- Iniciar segmentacao do estado por dominio

### Responsaveis sugeridos
- Backend Lead
- Front-end Senior
- QA

### Dependencias
- Prioridade 0 concluida

### Risco de regressao
Medio / alto

### Criterio de aceite
- smoke suite executavel e obrigatoria
- falhas de persistencia deixam de ser mascaradas
- contratos minimos documentados e aplicados

## Prioridade 2 - Consolidacao da Arquitetura

### Objetivo
Tirar regra critica do browser e criar fronteira real de dominio.

### Problemas atacados
- backend inexistente como camada de dominio
- regras de negocio no frontend
- frontend com responsabilidade excessiva
- contratos nao versionados

### Acoes concretas
- Criar BFF / Edge Functions para:
  - campanhas e campanha_envios
  - acessos e auditoria administrativa
  - validacoes criticas multi-etapa
  - consultas de elegibilidade e agregacoes caras
- Transformar `src/app/api.js` em client gateway fino
- Criar services por dominio
- Mover filtros e agregacoes relevantes para SQL/functions

### Responsaveis sugeridos
- Backend Lead
- Product Engineer
- DBA / Supabase Owner

### Dependencias
- Prioridade 1 estabilizada

### Risco de regressao
Alto

### Criterio de aceite
- campanhas e acessos criticos nao dependem mais de regra central no cliente
- `src/app/api.js` deixa de conter regra critica de negocio

## Prioridade 3 - Observabilidade, Testes e Governanca Continua

### Objetivo
Transformar o sistema em operacao governada, auditavel e evolutiva.

### Problemas atacados
- ausencia de observabilidade operacional
- ausencia de pipeline formal de CI/CD
- documentacao sem enforcement pratico

### Acoes concretas
- Implementar CI com checks obrigatorios
- Introduzir logs estruturados e metricas operacionais
- Criar gate formal de PR e release
- Introduzir migration runner / versionamento de schema
- Formalizar ownership por dominio

### Responsaveis sugeridos
- DevOps / SRE
- Backend Lead
- QA
- Lideranca de Produto

### Dependencias
- Prioridades 1 e 2

### Risco de regressao
Baixo / medio

### Criterio de aceite
- nenhuma release critica sem pipeline, teste e gate

---

## 3. Plano de Acao por Frente de Trabalho

### Seguranca e RLS
- Diagnostico resumido: coexistencia de modelo seguro e modelo aberto
- Problema central: risco operacional de exposicao indevida
- Acao corretiva: descontinuar `01b`, validar RLS/RBAC por ambiente, checklist de rollout SQL
- Dono principal: DBA / Supabase Owner
- Apoio necessario: Backend Lead, DevOps / SRE
- Ordem recomendada: 1
- Definicao de pronto: ambiente produtivo auditado, scripts aprovados e politicas validadas por role

### Backend / BFF ou Edge Functions
- Diagnostico resumido: browser atua como camada de dominio
- Problema central: regra critica e escrita direta no banco a partir do cliente
- Acao corretiva: Edge Functions para campanhas, acessos, validacoes e fluxos multi-etapa
- Dono principal: Backend Lead
- Apoio necessario: Product Engineer
- Ordem recomendada: 3
- Definicao de pronto: operacoes criticas passam por backend de dominio

### Regras de Dominio
- Diagnostico resumido: regras dispersas entre `src/features/*`, `src/app/api.js` e `src/app/store.js`
- Problema central: ausencia de fonte unica de verdade
- Acao corretiva: service layer por dominio
- Dono principal: Staff / Principal + Backend Lead
- Apoio necessario: Front-end Senior
- Ordem recomendada: 4
- Definicao de pronto: regras documentadas, centralizadas e testadas

### Contratos e Versionamento
- Diagnostico resumido: consumo de PostgREST cru e contratos implicitos
- Problema central: quebra silenciosa entre frontend e schema
- Acao corretiva: contratos minimos, DTOs, padrao de erro e versionamento logico
- Dono principal: Backend Lead
- Apoio necessario: Product Engineer
- Ordem recomendada: 5
- Definicao de pronto: recursos criticos com contrato explicito e validacao minima

### Testes
- Diagnostico resumido: ausencia de suite automatizada
- Problema central: regressao nao detectada
- Acao corretiva: smoke + integracao para fluxos criticos
- Dono principal: QA
- Apoio necessario: Front-end Senior, Backend Lead
- Ordem recomendada: 2
- Definicao de pronto: suite minima obrigatoria executada em pipeline

### Observabilidade
- Diagnostico resumido: predomina `console.error` e feedback visual
- Problema central: baixa capacidade de diagnostico
- Acao corretiva: logging estruturado, metricas, eventos criticos e alertas
- Dono principal: DevOps / SRE
- Apoio necessario: Backend Lead
- Ordem recomendada: 7
- Definicao de pronto: incidentes criticos rastreaveis por evidencia

### Governanca de Release e PR
- Diagnostico resumido: documentacao existe, enforcement nao
- Problema central: processo depende de disciplina informal
- Acao corretiva: gates obrigatorios, checklist executavel e aprovacao por frente
- Dono principal: Lideranca de Produto
- Apoio necessario: Staff / Principal, QA
- Ordem recomendada: 2
- Definicao de pronto: release sem gate vira bloqueio formal

### Hardening de Configuracao e Ambientes
- Diagnostico resumido: configuracao ainda depende de fallback no browser
- Problema central: ambiente inseguro e pouco rastreavel
- Acao corretiva: config por ambiente, sem default sensivel, bootstrap documentado
- Dono principal: DevOps / SRE
- Apoio necessario: Backend Lead
- Ordem recomendada: 1
- Definicao de pronto: ambiente sobe apenas com configuracao valida e rastreavel

### Estado Global e Organizacao do Frontend
- Diagnostico resumido: `src/app/store.js` central e mutavel
- Problema central: acoplamento, efeito colateral e regressao
- Acao corretiva: slices por dominio, menos side effects, menos regra compartilhada opaca
- Dono principal: Front-end Senior
- Apoio necessario: Product Engineer
- Ordem recomendada: 6
- Definicao de pronto: estado previsivel, ownership por dominio e menor acoplamento

### Persistencia, Schema e Migrations
- Diagnostico resumido: SQL manual e drift tolerado pelo app
- Problema central: ambiente divergente e falha mascarada
- Acao corretiva: migration runner, validacao de schema e bloqueio de fallback estrutural
- Dono principal: DBA / Supabase Owner
- Apoio necessario: Backend Lead
- Ordem recomendada: 2
- Definicao de pronto: schema versionado, aplicacao falha cedo quando ambiente diverge

---

## 4. Backlog Executivo

| ID | Frente | Item | Descricao objetiva | Prioridade | Responsavel sugerido | Prazo sugerido | Dependencia | Bloqueador | Criterio de conclusao |
|---|---|---|---|---|---|---|---|---|---|
| B01 | Seguranca e RLS | Congelar RLS anon | Proibir `01b_rls_anon_dev.sql` fora de dev controlado | P0 | DBA / Supabase Owner | 2 dias | Nenhuma | Acesso ao ambiente | Politica formal publicada e validada |
| B02 | Seguranca e RLS | Auditoria RLS prod | Validar `02/03/04/05` em ambiente real | P0 | DBA / Supabase Owner | 3 dias | B01 | Janela de acesso | Evidencia de validacao por role |
| B03 | Hardening de ambiente | Remover defaults sensiveis | Eliminar URL/chave default hardcoded | P0 | Backend Lead | 2 dias | Nenhuma | Definicao de config | App sobe so com config valida |
| B04 | Persistencia | Bloquear fallback de schema | Remover tolerancia a coluna ausente e drift | P1 | Backend Lead | 5 dias | B02 | Schema atual | App falha explicitamente |
| B05 | Testes | Smoke critico | Cobrir login, setup, pedidos, campanhas, acessos | P1 | QA | 10 dias | B03 | Ferramental de teste | Suite obrigatoria em execucao |
| B06 | Governanca | Gate de release | Instituir checklist e aprovacao formal | P1 | Lideranca de Produto | 5 dias | Nenhuma | Acordo com lideranca | Release sem gate bloqueada |
| B07 | Backend/BFF | Edge Function campanhas | Mover fila/elegibilidade para backend | P1 | Backend Lead | 15 dias | B02 | Contrato do fluxo | Campanha nao depende de regra central no front |
| B08 | Backend/BFF | Edge Function acessos | Mover RBAC/auditoria para backend | P1 | Backend Lead | 15 dias | B02 | Contrato de seguranca | Front nao escreve diretamente em operacoes criticas |
| B09 | Contratos | Padronizar `SB.*` | Criar envelope de erro e resposta minima | P1 | Backend Lead | 7 dias | B03 | Consenso de interface | Wrapper unico adotado |
| B10 | Frontend | Hardening auth UI | Remover dependencia de seletor legado fragil | P1 | Front-end Senior | 7 dias | B02 | Mapeamento de acoes | Guards consistentes por data-attributes |
| B11 | Persistencia | Migration runner | Versionar schema e validar ambiente | P1 | DBA / Supabase Owner | 15 dias | B02 | Ferramenta definida | Migrations rastreaveis e repetiveis |
| B12 | Dominio | Service layer | Centralizar regra de negocio critica | P2 | Staff / Backend Lead | 30 dias | B07, B08 | Arquitetura alvo | Dominio explicitado e desacoplado |
| B13 | Frontend | Segmentar store | Reduzir `D`/`State` globais por dominio | P2 | Front-end Senior | 20 dias | B05 | Capacidade do time | Estado previsivel por dominio |
| B14 | Observabilidade | Logging estruturado | Capturar eventos criticos com contexto | P2 | DevOps / SRE | 15 dias | B07 | Stack de logs | Logs pesquisaveis por incidente |
| B15 | Observabilidade | Metricas operacionais | Erro, latencia e falha de persistencia | P2 | DevOps / SRE | 20 dias | B14 | Stack de metricas | Dashboard minimo operacional |
| B16 | Frontend | Governanca CSS | Bloquear padrao paralelo por tela | P2 | Front-end Senior | 12 dias | B06 | Guia aprovado | Novo CSS fora da base comum bloqueado |
| B17 | Contratos | Versionamento logico | Definir versao minima para fluxos criticos | P2 | Backend Lead | 20 dias | B09 | Design de contrato | Recursos criticos versionados |
| B18 | Governanca | Ownership por dominio | Definir dono tecnico por area sensivel | P2 | Staff / Produto | 7 dias | B06 | Estrutura do time | Ownership publicado |
| B19 | Testes | Integracao backend | Cobrir campanhas e acessos server-side | P2 | QA | 20 dias | B07, B08 | Ambiente de teste | Fluxos backend validos |
| B20 | Governanca | CI/CD minimo | Pipeline com checks obrigatorios | P2 | DevOps / SRE | 20 dias | B05, B11 | Infra pipeline | Merge/release com gate tecnico |

---

## 5. Plano 30 / 60 / 90 / 180 Dias

## 0-30 dias

### Obrigatoriamente pronto
- B01, B02, B03, B04, B05, B06

### Pode rodar em paralelo
- congelamento de RLS anon
- remocao de defaults sensiveis
- smoke tests
- gate de release

### Nao pode avancar antes
- Edge Functions criticas nao devem entrar antes da seguranca e ambiente estarem estabilizados

### Meta minima
- base segura o suficiente para nao causar incidente previsivel

## 31-60 dias

### Obrigatoriamente pronto
- B07, B08, B09, B10, B11

### Pode rodar em paralelo
- migration runner
- padronizacao de contratos
- hardening de auth UI

### Nao pode avancar antes
- regras criticas nao podem continuar entrando no frontend

### Meta minima
- browser deixa de ser autoridade principal de dominio critico

## 61-90 dias

### Obrigatoriamente pronto
- B12, B13, B14, B15

### Pode rodar em paralelo
- segmentacao de store
- service layer
- logging e metricas

### Nao pode avancar antes
- sem backend de dominio minimo, observabilidade so gera ruido parcial

### Meta minima
- regressao detectavel e troubleshooting operacional viavel

## 91-180 dias

### Obrigatoriamente pronto
- B16, B17, B18, B19, B20

### Pode rodar em paralelo
- governanca CSS
- ownership por dominio
- CI/CD minimo
- testes de integracao expandidos

### Nao pode avancar antes
- sem ownership e pipeline, a base continua vulneravel a recaida

### Meta minima
- base sai do estado apenas funcional e entra em operacao governada

---

## 6. Matriz de Responsabilidade

| Papel | Decide | Implementa | Aprova | Valida | Bloqueia |
|---|---|---|---|---|---|
| Backend Lead | contratos, service layer, Edge Functions | backend de dominio | PRs backend criticos | integridade funcional server-side | crescimento de regra critica no front |
| Front-end Senior | arquitetura de estado e UI | refactor frontend, guards, store | PRs frontend sensiveis | regressao visual e funcional | padrao errado de frontend |
| Product Engineer | integracao entre fluxos e produto | ajustes fullstack e contratos | fluxos operacionais | aderencia produto/engenharia | acoplamento oportunista |
| QA | estrategia de smoke e integracao | suites e validacao | evidencias de teste | criterios de aceite | release sem cobertura minima |
| DBA / Supabase Owner | RLS, schema, migrations | SQL e validacao ambiente | mudancas de persistencia | consistencia de ambiente | rollout inseguro |
| DevOps / SRE | pipeline, observabilidade, ambientes | CI/CD, logs, metricas | readiness operacional | telemetria e incidentes | release sem gate tecnico |
| Lideranca de Produto | prioridade e janela | alinhamento executivo | gate politico de release | impacto no negocio | crescimento fora do plano |

---

## 7. Criterios de Aceite por Onda

## Onda 1

### Precisa existir
- RLS segura validada
- sem default sensivel
- checklist de ambiente ativo

### Evidencias
- validacao SQL por ambiente
- revisao de permissao por role
- PR/commit removendo fallback sensivel

### Invalida a conclusao
- qualquer tabela critica acessivel fora da politica esperada
- app ainda operar com config default sensivel

### Riscos residuais aceitaveis
- parte da regra critica ainda no cliente, desde que ambiente esteja protegido

## Onda 2

### Precisa existir
- smoke tests criticos
- migration runner ou processo equivalente versionado
- falha explicita para drift de schema

### Evidencias
- pipeline/suite executando
- validacao de ambiente
- remocao de fallback estrutural

### Invalida a conclusao
- persistencia local silenciosa
- schema divergente tolerado pelo app

### Riscos residuais aceitaveis
- store global ainda parcialmente existente

## Onda 3

### Precisa existir
- regras criticas fora do browser
- contrato minimo de API
- logging minimo operacional

### Evidencias
- Edge Functions/BFF em uso
- chamadas criticas indo para backend de dominio
- logs estruturados ativos

### Invalida a conclusao
- campanha ou acessos criticos ainda comandados principalmente no frontend

### Riscos residuais aceitaveis
- CSS e componentizacao ainda em transicao

## Onda 4

### Precisa existir
- CI/CD minimo
- ownership por dominio
- observabilidade e governanca continua

### Evidencias
- pipeline ativo
- dashboard/alertas minimos
- tabela de ownership publicada

### Invalida a conclusao
- release critica ainda depender de validacao manual informal

### Riscos residuais aceitaveis
- melhorias evolutivas de UX/DX ainda em backlog

---

## 8. Riscos de Execucao

| Risco | Causa | Impacto | Mitigacao | Dono |
|---|---|---|---|---|
| Regressao funcional ao mover regra para backend | regra hoje dispersa e pouco testada | quebra de fluxo critico | rollout incremental + smoke suite antes e depois | Backend Lead |
| Paralizacao por falta de acesso a ambiente | Supabase e SQL dependem de acesso administrativo | atraso da onda 0 | dono formal de ambiente e janela reservada | DBA / SRE |
| Time seguir priorizando feature acima de saneamento | pressao de entrega | plano nao fecha gargalos reais | sponsorship executivo e freeze formal | Lideranca de Produto |
| Falsa sensacao de melhoria | foco em front visual antes de seguranca e dominio | risco estrutural permanece | gates por onda e criterios de aceite | Staff / Principal |
| Refactor grande sem ownership claro | modulos sensiveis e acoplados | regressao e retrabalho | ownership por frente e arquivo | Staff / Tech Lead |
| Migration inconsistente entre ambientes | SQL manual sem runner | comportamento divergente | migration runner + checklist de rollout | DBA |

---

## 9. Regras de Bloqueio Imediato

### Fica proibido a partir de agora
- criar nova regra critica em `src/features/*`
- adicionar novo fallback estrutural em `src/app/api.js`
- usar `sql/01b_rls_anon_dev.sql` como caminho aceitavel fora de dev controlado
- mascarar falha de persistencia com cache local como comportamento normal

### Exige aprovacao formal
- qualquer alteracao em RLS / RBAC
- qualquer mudanca em `src/app/api.js`
- qualquer mudanca em `src/app/store.js`
- qualquer fluxo multi-etapa que grave em multiplas tabelas

### Deve ser congelado ate refatoracao
- crescimento do estado global compartilhado sem ownership
- crescimento de CSS paralelo por tela fora da base comum
- novos fluxos criticos direto contra PostgREST

### Deve ser removido do fluxo atual
- dependencia de configuracao default embutida
- tolerancia a schema incompleto no cliente

### Nao pode continuar crescendo
- regra de negocio duplicada entre frontend e acesso a dados
- autorizacao baseada apenas em camada visual

---

## 10. Criterios de Sucesso

### Sinais tecnicos
- regras criticas centralizadas
- app falha cedo quando schema ou ambiente divergem
- nenhum fallback estrutural novo

### Sinais operacionais
- incidentes criticos rastreaveis
- ambiente previsivel e auditavel
- rollout SQL com validacao formal

### Sinais de governanca
- release gate ativo
- ownership por dominio claro
- PR sensivel com aprovacao obrigatoria

### Indicadores minimos
- 100% dos fluxos criticos com smoke test
- 0 uso de RLS aberta em producao
- 0 fallback de schema tolerado em caminho principal
- metricas minimas de erro e latencia para fluxos criticos

### Sinais de que a base saiu do estado apenas funcional
- a equipe consegue evoluir e diagnosticar sem depender de conhecimento tacito de uma pessoa

---

## 11. Fechamento Executivo

### Recomendacao de execucao
Tratar este roadmap como programa de saneamento tecnico obrigatorio, com patrocinio executivo e gates reais.

### Ordem politica correta para lideranca bancar
1. Seguranca e ambiente
2. Testes e estabilidade minima
3. Backend de dominio
4. Observabilidade e governanca
5. Evolucao estrutural e escalabilidade

### Maiores erros que nao podem acontecer
- focar em estetica e ergonomia antes de corrigir seguranca e dominio
- aceitar fallback como solucao permanente
- permitir que a base continue crescendo no browser como camada principal de negocio
- tentar grande refactor sem smoke suite minima

### O que precisa ser tratado como nao negociavel
- RLS segura em producao
- fim de drift tolerado no cliente
- release gate minimo
- regras criticas saindo do frontend

### Leitura final sobre a maturidade alvo
O alvo nao e apenas um sistema funcional. O alvo e uma operacao tecnicamente governada, com seguranca previsivel, dominio protegido, evolucao segura e capacidade real de escalar sem colapsar em debito tecnico.

---

## 12. Tabela-resumo Executiva

| Prioridade | Acao | Responsavel | Prazo |
|---|---|---|---|
| P0 | Congelar RLS anon e validar producao | DBA / Backend Lead | 1 semana |
| P0 | Remover defaults sensiveis | Backend Lead | 1 semana |
| P1 | Criar smoke tests criticos | QA | 2 semanas |
| P1 | Bloquear fallback de schema | Backend Lead | 2 semanas |
| P1 | Implantar migration runner | DBA / Supabase Owner | 3 semanas |
| P1 | Instituir gate de release | Lideranca de Produto | 2 semanas |
| P1 | Criar Edge Functions de campanhas | Backend Lead | 4 semanas |
| P1 | Criar Edge Functions de acessos | Backend Lead | 4 semanas |
| P2 | Segmentar store por dominio | Front-end Senior | 6 semanas |
| P2 | Implantar observabilidade minima | DevOps / SRE | 6 semanas |

## 13. Lista de Bloqueios Imediatos

- novos fallbacks em `src/app/api.js`
- novas regras criticas em `src/features/*`
- uso operacional do SQL `01b`
- release sem checklist e gate
- mudancas sensiveis sem ownership e validacao

## 14. Lista de Dependencias Criticas do Plano

- acesso administrativo ao Supabase
- definicao formal de ambientes
- sponsorship executivo
- ferramental de teste
- ferramental de migrations
- capacidade backend para Edge Functions / BFF

## 15. Lista de Erros que Invalidam a Governanca Backend

- manter regra critica no browser por conveniencia
- aceitar RLS de dev como pratica toleravel
- seguir sem testes de fluxo critico
- tolerar drift de schema no cliente
- seguir sem gate tecnico de release

## 16. Lista de Sinais de que a Implementacao esta no Caminho Certo

- PRs param de introduzir fallback e regra critica no frontend
- ambiente produtivo passa em checklist SQL / RBAC
- smoke tests detectam regressao real antes de release
- campanhas e acessos saem do cliente
- erros criticos passam a ter contexto rastreavel

## 17. Lista de Acoes com Maior ROI Tecnico no Curto Prazo

- congelar `01b` e validar `02/03/04/05`
- remover config default hardcoded
- criar smoke tests criticos
- bloquear fallback de schema
- mover campanhas para Edge Function
- instituir gate minimo de release
