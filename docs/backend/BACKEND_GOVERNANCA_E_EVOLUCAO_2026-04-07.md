# Diagnóstico e Plano de Governança Backend

Data: 2026-04-07
Perfil da análise: Staff/Principal Backend Engineering
Escopo analisado: camada de acesso a dados (`src/app/api.js`), regras de domínio em módulos front (`src/features/*`), scripts SQL de schema e RLS (`sql/*`).

## 1. Leitura executiva do backend

### Estado atual percebido da arquitetura
- O sistema opera em modelo "frontend + Supabase PostgREST" sem serviço backend dedicado (BFF/API própria).
- A camada `src/app/api.js` concentra chamadas REST diretas ao banco e parte de regra de negócio (ex.: elegibilidade de campanha/aniversário).
- Há coexistência de dois modelos de segurança: ambiente aberto para `anon` e ambiente com RLS por `authenticated`.

### Nível de maturidade do backend
- Maturidade atual: **funcional, porém frágil para escala e governança**.
- Forte em velocidade de entrega.
- Fraca em isolamento de domínio, segurança operacional, observabilidade e contratos versionados.

### Principais riscos imediatos
- Chave e endpoint Supabase embutidos no cliente (`src/app/api.js:1-2`).
- Potencial uso de RLS aberto para `anon` em produção se script incorreto for aplicado (`sql/01b_rls_anon_dev.sql:24-64`).
- Regras críticas no cliente, com risco de bypass e inconsistência entre usuários/sessões.
- Falhas de persistência com fallback local podem mascarar erro real (ex.: campanhas/jogos).

### Principais gargalos estruturais
- Ausência de camada de serviço backend para centralizar validação, autorização e observabilidade.
- Contratos API implícitos, sem versionamento formal.
- Ausência de testes automatizados e pipeline de qualidade backend.
- Ausência de instrumentação operacional padrão (métricas, traces, alertas SLO).

### Consequências de manter a arquitetura atual sem correções
- Aumento de incidentes silenciosos em produção.
- Regressões funcionais difíceis de diagnosticar.
- Crescimento de débito técnico em lógica de negócio distribuída no front.
- Risco de exposição indevida de dados por configuração/uso incorreto de RLS.

## 2. Avaliação arquitetural

### Organização do código e modularidade
- Organização funcional por módulo de tela, não por bounded context de backend.
- `src/app/api.js` atua como "gateway" único para DB, mas mistura acesso a dados + utilitários de negócio.

### Separação de responsabilidades
- Separação incompleta:
  - transporte (REST),
  - regra de negócio (elegibilidade campanha),
  - fallback de compatibilidade de schema,
  - tratamento de erro.
- Regras de domínio estão em `src/features/campanhas.js` e `src/app/api.js`, sem camada de domínio consolidada.

### Acoplamento entre módulos
- Alto acoplamento entre UI state (`store.js`) e persistência.
- Dependência direta de `State.FIL` em múltiplos fluxos.

### Clareza entre camadas
- Não há camadas backend clássicas (routes/controllers/services/repositories/jobs).
- Há apenas camada cliente chamando PostgREST diretamente.

### Consistência de padrões
- Existe padrão de uso `SB.*`, porém sem padronização de contrato de resposta, códigos de erro e retries.

### Reuso vs duplicação lógica
- Reuso razoável para CRUD básico.
- Duplicação perceptível em filtros e consultas de aniversariantes/elegibilidade.

### Riscos de crescimento desordenado
- Sem BFF, toda regra nova tende a ir para frontend.
- Sem governance de contrato, maior chance de quebra front-back a cada ajuste de schema.

## 3. Avaliação de APIs e contratos

### Consistência dos endpoints
- Endpoints seguem padrão PostgREST por tabela.
- Coesão sintática existe, mas não há contrato formal de domínio por recurso.

### Previsibilidade de payloads
- Previsibilidade parcial.
- Há compatibilidade ad-hoc para coluna ausente (`upsertCliente` com fallback sem `time`, `src/app/api.js:106-121`).

### Padronização de respostas
- Resposta retorna JSON cru do PostgREST (`sbReq`), sem envelope padrão (`data`, `error`, `meta`).

### Tratamento de erros
- Erro convertido para `throw Error(string)` sem códigos de domínio.
- Uso recorrente de fallback local no front após falha de persistência.

### Versionamento
- Inexistente (sem `/v1`, `/v2`, sem controle formal de breaking change).

### Validação de entrada
- Principalmente no front; inexistente na borda server dedicada.
- Dependência de constraints SQL e RLS.

### Idempotência
- Parcial via `on_conflict` e índices únicos (`sql/01_schema_alignment.sql`).
- Alguns fluxos críticos dependem de verificação prévia + inserção separada (janela de corrida).

### Riscos de quebra de contrato front-back
- Alto risco quando schema evolui sem migração aplicada em todos ambientes.
- Evidência: fallback de coluna ausente para `clientes.time`.

## 4. Avaliação de regras de negócio

### Centralização ou dispersão
- Dispersas entre `src/app/api.js` e módulos de UI.

### Duplicidade de validações
- Validações de formulário no front coexistem com regras implícitas do banco.
- Sem fonte única de regra de domínio server-side.

### Regras críticas misturadas com lógica de transporte
- Elegibilidade de campanhas/aniversários dentro do client data layer (`src/app/api.js:294-315`).

### Risco de inconsistência entre fluxos
- Alto: diferentes telas podem implementar filtros/regras de forma divergente.

### Aderência ao negócio real
- Aderência funcional está boa para operação atual.
- Fragilidade para auditoria e rastreabilidade de decisões automáticas.

### Facilidade de evoluir comportamento
- Evoluir sem quebrar está difícil: qualquer mudança exige sincronizar múltiplos pontos no frontend.

## 5. Segurança da aplicação

### Autenticação e autorização
- Produção proposta com RLS por `authenticated` e `user_filiais` (`sql/02_rls_producao.sql`).
- Existe script de RLS totalmente aberto para `anon` (`sql/01b_rls_anon_dev.sql`) com alto risco operacional se aplicado incorretamente.

### Validação e sanitização de inputs
- Predominantemente cliente-side.
- Não há camada server dedicada para sanitização e políticas centralizadas.

### Exposição de dados sensíveis
- URL do projeto e chave publishable expostas no cliente (`src/app/api.js:1-2`).
- Em Supabase isso é esperado para `anon/publishable`, mas exige RLS impecável e monitorado.

### Risco de elevação de privilégio
- Alto se políticas RLS forem mal configuradas, especialmente via script dev aberto.

### Risco em endpoints críticos
- Operações críticas (campanha/envio, estoque, pedidos) executadas direto no DB sem camada de proteção de negócio.

### Gestão de segredos e variáveis de ambiente
- Não há configuração de ambiente no repositório (hardcoded no JS).

### Logs, rastreabilidade e auditoria
- Logs majoritariamente `console.error`, sem trilha auditável central.

## 6. Performance e confiabilidade

### Gargalos em operações críticas
- Queries de aniversariantes elegíveis carregam base e filtram no cliente (`src/app/api.js:294+`), escalabilidade limitada.

### Concorrência e consistência transacional
- Ausência de transações de domínio coordenadas para fluxos multi-etapa.
- Risco de condição de corrida em prevenção de duplicidade de envio.

### Tempo de resposta
- Sem orçamento de latência definido e sem monitoramento de p95/p99.

### Síncrono vs assíncrono
- Processos potencialmente pesados (sincronizar jogos, gerar fila campanha) rodam de forma síncrona no cliente.

### Filas, retries, timeout, circuit breaker, fallback
- Sem timeout configurado em `fetch`.
- Sem retry/backoff estruturado.
- Fallback local existe, mas sem reconciliação robusta posterior.

### Resiliência a falhas de integração
- Baixa a moderada. Há tratamento de erro visual, mas não há estratégia operacional de recuperação.

### Risco de degradação com aumento de uso
- Alto, especialmente em operações que varrem dados no cliente.

## 7. Observabilidade e suporte operacional

### Logging
- Sem logging estruturado centralizado.

### Tracing
- Inexistente.

### Métricas
- Métricas UX/produto no front evoluíram, porém não substituem métricas operacionais backend.

### Monitoramento e alertas
- Não há definição de SLI/SLO, nem alertas por erro/latência de endpoint.

### Diagnóstico em produção
- Limitado; dependente de reprodução manual e console do browser.

## 8. Governança de código e manutenção

### Padrões e convenções
- Padrão de módulos frontend consistente, porém não há padrão backend por camadas.

### Pastas e naming
- Estrutura clara para front/docs/sql.
- Ausência de pasta/camada backend dedicada.

### Cobertura e qualidade de testes
- Não há suíte de testes automatizados detectada.

### Migrations, seeds, scripts, jobs
- Há scripts SQL úteis para alinhamento e RLS.
- Não há pipeline de migration versionada com validação automática em CI.

### Onboarding técnico
- README mínimo (`README.md` praticamente vazio), risco alto de onboarding tácito.

### Risco de conhecimento concentrado
- Alto, dado acoplamento em arquivos centrais e ausência de documentação técnica backend formal.

## 9. Principais problemas encontrados

1. **Backend inexistente como camada de domínio**
- Descrição: app depende de acesso direto do cliente ao PostgREST.
- Causa provável: priorização de velocidade inicial.
- Impacto técnico: regras e segurança distribuídas, difícil governar.
- Impacto negócio: maior risco de incidente e regressão.
- Risco: alto.
- Gravidade: crítica.
- Prioridade: curto prazo.

2. **Configuração de segurança ambígua entre dev/prod**
- Descrição: coexistência de script com políticas abertas `anon` e script seguro por `authenticated`.
- Causa provável: necessidade de operação sem auth na fase inicial.
- Impacto técnico: superfície de erro operacional elevada.
- Impacto negócio: possível exposição indevida de dados.
- Risco: crítico.
- Gravidade: crítica.
- Prioridade: curto prazo.

3. **Regras de negócio no frontend**
- Descrição: elegibilidade de campanha e filtros críticos executados no cliente.
- Causa provável: ausência de service layer.
- Impacto técnico: inconsistência e baixa auditabilidade.
- Impacto negócio: campanhas incorretas e retrabalho comercial.
- Risco: alto.
- Gravidade: alta.
- Prioridade: curto prazo.

4. **Contratos não versionados e sem schema enforcement**
- Descrição: payloads e respostas sem versionamento formal.
- Causa provável: uso direto de PostgREST sem API facade.
- Impacto técnico: quebra silenciosa de integração.
- Impacto negócio: indisponibilidade funcional parcial.
- Risco: alto.
- Gravidade: alta.
- Prioridade: médio prazo.

5. **Ausência de observabilidade operacional backend**
- Descrição: sem tracing, sem métricas de endpoint, sem alertas.
- Causa provável: arquitetura client-heavy.
- Impacto técnico: MTTR alto.
- Impacto negócio: tempo maior de indisponibilidade percebida.
- Risco: alto.
- Gravidade: alta.
- Prioridade: médio prazo.

6. **Sem suite de testes automatizados**
- Descrição: inexistência de cobertura unit/integration/contract.
- Causa provável: evolução orgânica sem quality gate.
- Impacto técnico: regressão frequente.
- Impacto negócio: perda de confiança em release.
- Risco: alto.
- Gravidade: alta.
- Prioridade: curto prazo.

7. **Fallback local mascarando falha de persistência**
- Descrição: operação continua local mesmo após erro de gravação remota em alguns fluxos.
- Causa provável: tentativa de manter UX resiliente.
- Impacto técnico: estado divergente cliente-banco.
- Impacto negócio: decisão com dados incorretos.
- Risco: médio-alto.
- Gravidade: alta.
- Prioridade: curto prazo.

8. **Ausência de timeout/retry padrão para integrações externas**
- Descrição: fetch sem timeout e sem política robusta.
- Causa provável: simplicidade inicial.
- Impacto técnico: travamento/espera indefinida e baixa resiliência.
- Impacto negócio: experiência instável.
- Risco: médio.
- Gravidade: média.
- Prioridade: médio prazo.

## 10. Estratégia de ataque

### Correções imediatas
- Congelar criação de nova regra de negócio no frontend.
- Definir e bloquear ambiente de produção para usar somente RLS `authenticated`.
- Remover ambiguidade de scripts (dev/prod) com guardrails de execução.
- Introduzir timeout/retry mínimo nas chamadas críticas.

### Estabilização estrutural
- Criar camada backend leve (BFF/Edge Functions) para operações críticas:
  - campanhas/envios,
  - pedidos,
  - estoque/transfers,
  - integrações externas.
- Padronizar contrato de resposta e erro.

### Evolução de médio prazo
- Migrar regras de domínio para services server-side.
- Implementar observabilidade (logs estruturados, métricas, alertas).
- Formalizar versionamento de API e contract tests.

### Preparação para escala e governança
- Definir governance formal de endpoint, schema e release.
- CI com gates de segurança, testes e contrato.
- Adoção de SLO por capability crítica.

### Ordem recomendada
1. Segurança e contenção (não negociável).
2. Isolamento de domínio crítico em backend.
3. Observabilidade + testes.
4. Escala e governança avançada.

### O que deve ser congelado imediatamente
- Nova lógica de negócio no cliente para fluxos críticos.
- Novo endpoint implícito via query ad-hoc em tela.
- Uso de políticas `anon using (true)` fora de ambiente local controlado.

### O que precisa de refatoração antes de novas features
- Fluxo de campanhas/envios.
- Fluxo de movimentação/estoque multi-etapa.
- Contrato de erro e resposta de API.

## 11. Plano de execução por ondas

### Onda 1: contenção e segurança
- Objetivo: eliminar risco crítico de exposição e inconsistência grave.
- Escopo: RLS, credenciais, operações críticas atuais.
- Ações práticas:
  - validar ambiente prod com `02_rls_producao.sql` e checklist de hardening;
  - restringir/arquivar script `01b_rls_anon_dev.sql` para uso local controlado;
  - externalizar URL/chave para configuração por ambiente;
  - adicionar timeout + retry com backoff em chamadas críticas.
- Responsáveis: Backend Lead, DBA/Supabase owner, Front-end Sênior.
- Dependências: acesso admin Supabase e pipeline deploy.
- Risco de regressão: médio.
- Critério de aceite: zero política aberta em prod; checklist de segurança aprovado.

### Onda 2: consolidação arquitetural
- Objetivo: separar domínio do cliente.
- Escopo: criar BFF/Edge layer e mover regras críticas.
- Ações práticas:
  - criar serviços server-side para campanhas/envios e elegibilidade;
  - padronizar resposta (`data/error/meta`);
  - padronizar códigos de erro de domínio.
- Responsáveis: Backend Team + Product Engineer.
- Dependências: definição de stack backend (Supabase Edge/Node API).
- Risco de regressão: médio-alto.
- Critério de aceite: fluxos críticos executam via serviço backend governado.

### Onda 3: confiabilidade e observabilidade
- Objetivo: reduzir MTTR e falha por release.
- Escopo: logs, métricas, tracing e alertas.
- Ações práticas:
  - logging estruturado com correlation id;
  - métricas por endpoint (latência p95, erro, throughput);
  - alertas operacionais para falhas críticas.
- Responsáveis: Backend + SRE/DevOps + QA.
- Dependências: stack observabilidade (ex. Grafana/Datadog/Sentry).
- Risco de regressão: baixo.
- Critério de aceite: dashboards e alertas ativos em produção.

### Onda 4: governança e escalabilidade
- Objetivo: manter qualidade em crescimento.
- Escopo: política de PR, testes, versionamento de contrato, debt backlog.
- Ações práticas:
  - instituir quality gates em CI;
  - cobertura mínima para fluxos críticos;
  - contract tests e política de depreciação versionada.
- Responsáveis: Engenharia + QA + Liderança Produto.
- Dependências: maturidade da Onda 2 e 3.
- Risco de regressão: baixo-médio.
- Critério de aceite: releases passam por gates obrigatórios sem exceção informal.

## 12. Política de governança para backend

- Todo novo endpoint deverá ter contrato documentado (request/response/errors).
- Toda nova regra de negócio crítica deverá nascer em service backend, não em tela.
- Mudanças de contrato deverão seguir versionamento e janela de depreciação.
- Tratamento de erro deverá usar catálogo de erros padronizado por domínio.
- Respostas deverão seguir envelope comum para previsibilidade.
- Integrações externas deverão incluir timeout, retry e fallback explícito.
- Jobs assíncronos deverão ter idempotência, rastreabilidade e política de retry.
- Toda release com impacto de segurança deverá passar revisão de segurança formal.

## 13. Política de PR e code review

### Critérios obrigatórios
- contrato atualizado;
- validação de entrada e autorização;
- tratamento de erro padronizado;
- teste automatizado do fluxo alterado;
- observabilidade mínima (log + métrica).

### Motivos automáticos de reprovação
- endpoint sem autenticação/autorização adequada;
- regra de negócio crítica no frontend;
- quebra de contrato sem versionamento;
- ausência de teste de regressão em fluxo crítico;
- uso de segredo hardcoded.

### Sinais de débito técnico
- lógica duplicada de domínio;
- SQL/queries ad-hoc sem índice;
- fallback silencioso sem reconciliação;
- erro genérico sem contexto operacional.

### Quando bloquear merge
- impacto em segurança sem validação;
- alteração crítica sem teste;
- regressão de contrato sem plano de migração.

### Quando exigir refatoração prévia
- quando feature nova aumenta acoplamento em área já crítica;
- quando endpoint cresce sem camada de serviço/repositório;
- quando regra duplicada já existe em outro fluxo.

## 14. Política de testes

### Mínimo esperado
- Unitários: regras de domínio e validações críticas.
- Integração: endpoints principais com banco/serviços.
- Contrato: payload e erro padronizado por endpoint.
- Regressão: cenários críticos (campanha, pedido, estoque, cliente).

### Critérios mínimos antes de release
- 100% dos fluxos críticos alterados com teste de integração.
- Contract tests passando para endpoints alterados.
- Sem falhas críticas abertas de regressão.

## 15. Métricas de acompanhamento

- disponibilidade por capability crítica;
- taxa de erro por endpoint;
- latência p95/p99 por endpoint;
- falhas por release;
- cobertura de testes por domínio;
- taxa de regressão funcional pós-release;
- volume de débito técnico aberto/fechado;
- MTTR (tempo médio de diagnóstico/correção);
- sucesso de jobs/retries.

## 16. Cronograma sugerido

### Curto prazo (0-30 dias)
- Onda 1 completa.
- padrão mínimo de timeout/retry.
- checklist de segurança em release.

### Médio prazo (31-90 dias)
- Onda 2 iniciada/concluída para fluxos críticos.
- contratos padronizados e testes de integração/contrato.

### Longo prazo (91-180 dias)
- Onda 3 e Onda 4 consolidadas.
- observabilidade completa + governance contínua em CI.

### Sequência lógica
1. Segurança.
2. Domínio server-side.
3. Confiabilidade operacional.
4. Escala e governança contínua.

## 17. Fechamento executivo

Diagnóstico final:
- O backend atual está **funcional**, mas **não governado para escala segura**.
- A prontidão para crescimento é limitada por ausência de camada de domínio backend, observabilidade e testes.

Classificação de prontidão:
- atual: **funcional**;
- alvo pós-ondas 1-2: **estável**;
- alvo pós-ondas 3-4: **escalável e estratégico**.

Recomendação final:
- priorizar imediatamente segurança e isolamento de regras críticas em backend.
- sem essa etapa, qualquer crescimento de feature aumentará risco operacional e custo de manutenção.

---

## Tabela-resumo (prioridade, item, ação principal, responsável)

| Prioridade | Item | Ação principal | Responsável |
|---|---|---|---|
| P0 | Segurança RLS | Garantir somente política `authenticated` em produção | Backend Lead + DBA |
| P0 | Regras críticas no front | Migrar campanhas/envios para service backend | Backend Team |
| P0 | Hardcoded config | Externalizar configuração por ambiente | Backend + Front-end Sênior |
| P1 | Contratos API | Padronizar envelope e catálogo de erros | Backend Architect |
| P1 | Testes críticos | Cobrir fluxo cliente/pedido/campanha/estoque | QA + Backend |
| P1 | Fallback inconsistente | Definir reconciliação e evitar divergência local/remoto | Product Eng |
| P2 | Observabilidade | Logs estruturados + métricas + alertas | Backend + DevOps |
| P2 | Versionamento | Estratégia de versionamento e depreciação | Backend + Produto |
| P3 | Governança contínua | Quality gates e auditoria técnica recorrente | Eng Leadership |

## Proibições imediatas no backend
- Publicar produção com políticas `anon using (true)`.
- Adicionar regra de negócio crítica nova no frontend.
- Criar endpoint/consulta sem validação e sem contrato.
- Fazer merge de alteração crítica sem teste de integração.
- Manter segredo/configuração sensível hardcoded.

## Erros de arquitetura que não podem continuar
- Misturar regra de negócio crítica com lógica de UI.
- Tratar falha de persistência como sucesso operacional.
- Evoluir schema sem migração validada em todos ambientes.
- Operar sem telemetria técnica de backend.
- Crescer API sem versionamento e sem padronização de erros.

## Critérios mínimos para considerar o backend governado
- Segurança: RLS validada e auditável em produção.
- Arquitetura: fluxos críticos rodando em camada backend de domínio.
- Qualidade: testes unit/integration/contract para capacidades críticas.
- Operação: logs estruturados, métricas e alertas ativos.
- Governança: PR gates obrigatórios e política de mudança de contrato ativa.
