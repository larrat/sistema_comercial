# Plano Executivo - Fase B (UI Premium + Responsivo)

Data de início: 07/04/2026  
Status: Em andamento

## 1. Objetivo estratégico
Elevar o sistema para um padrão premium, moderno e consistente, com foco em:
- clareza visual por importância da informação;
- experiência fluida em mobile e desktop;
- aumento de produtividade operacional (menos cliques, menos erros, mais ação).

## 2. Metas de negócio (acompanhamento contínuo)
- Reduzir tempo médio para executar ações críticas (ex.: campanha, pedido, cadastro) em 20%.
- Reduzir retrabalho por erro de operação visual em 30%.
- Aumentar uso de ações estratégicas (campanhas, notificações, oportunidades) em 25%.
- Garantir consistência visual entre módulos principais (clientes, campanhas, dashboard, pedidos).

## 3. Escopo da Fase B
### B1. Fundamentos visuais
- Consolidar tokens de design (cores, tipografia, espaçamento, radius, shadow).
- Aplicar semântica de cor por prioridade:
  - Crítico: vermelho (ação imediata).
  - Atenção: âmbar (acompanhar).
  - Oportunidade: azul (chance comercial).
  - Sucesso: verde (status positivo/conclusão).

### B2. Componentes de interface
- Padronizar componentes base:
  - `Button`, `Input`, `Select`, `Badge`, `Card`, `Panel`, `Table`, `Modal`, `Toast`, `Tabs`.
- Remover divergências visuais entre páginas.

### B3. Fluxos críticos
- Clientes: listagem + modal responsivo com usabilidade premium.
- Campanhas: leitura rápida de status, fila e ações.
- Dashboard: prioridade para KPIs e oportunidades acionáveis.

### B4. Mobile-first
- Aplicar layout de cards em listas no mobile sem perda de contexto.
- Garantir botões primários visíveis e usáveis com uma mão.
- Ajustar modais para telas pequenas com foco em conclusão de tarefa.

## 4. Roadmap executivo (3 sprints)
## Sprint 1 (Semana 1) - Base de design e consistência
- Consolidar tema premium em `css/style.css` sem conflito de estilos legados.
- Harmonizar hierarquia tipográfica e contraste.
- Revisar estados visuais (hover, focus, disabled, loading, erro, sucesso).
- Entregável: Design System v1 aplicado no shell e componentes globais.

## Sprint 2 (Semana 2) - Fluxos-chave e responsividade real
- Refinar páginas de Clientes e Campanhas para mobile e desktop.
- Melhorar legibilidade de tabelas/cards com prioridade semântica.
- Ajustar topbar e CTAs por contexto de módulo.
- Entregável: UX consistente nos módulos de maior uso.

## Sprint 3 (Semana 3) - Otimização e governança visual
- Limpar estilos duplicados e reduzir CSS legado.
- Validar desempenho visual e estabilidade dos fluxos.
- Documentar padrão visual e checklist de qualidade para próximas features.
- Entregável: Base escalável para evolução contínua.

## 5. KPIs de acompanhamento
- Tempo para concluir tarefa (pedido/campanha/cadastro).
- Taxa de erro em ações de formulário.
- Taxa de conclusão em mobile.
- Cliques até ação principal por módulo.
- Uso do Centro de Notificações e ações resolvidas.

## 6. Critérios de aceite por frente
- Consistência visual:
  - Mesmo padrão de spacing, radius, sombra e botão em todos os módulos.
- Semântica de informação:
  - Alertas e badges com significado único e consistente.
- Responsividade:
  - Sem corte de conteúdo em 360px+.
  - Modais usáveis sem scroll confuso.
- Acessibilidade mínima:
  - foco visível;
  - contraste adequado nos estados prioritários.

## 7. Riscos e mitigação
- Risco: mistura de estilos antigos e novos gerar inconsistência.
  - Mitigação: aplicar migração por blocos e validar checklist por página.
- Risco: mudanças visuais impactarem fluxos já estáveis.
  - Mitigação: validação funcional ao fim de cada sprint.
- Risco: escopo expandir além da capacidade.
  - Mitigação: priorizar módulos com maior impacto comercial.

## 8. Próximas ações imediatas (execução)
1. Congelar padrão visual de Fase B no CSS (tokens + componentes base).
2. Rodar revisão de Clientes e Campanhas com foco mobile.
3. Fechar checklist de aceitação da Sprint 1.
4. Publicar versão incremental para validação em produção controlada.

## 9. Commit sugerido
`docs: adicionar plano executivo da fase B (ui premium e responsividade)`

## 10. Progresso Sprint 3 (iniciado em 07/04/2026)
- Limpeza de duplicidades CSS (clientes/campanhas) iniciada em `css/style.css`, removendo regras antigas redundantes que conflitam com a camada final do Design System.
- Validação de estabilidade visual iniciada com comando rápido `/ auditoria visual` (verificação de topbar, fluxos críticos e render de listas).
- Governança formalizada no documento `GOVERNANCA_VISUAL.md` com:
  - semântica de prioridade;
  - estados obrigatórios;
  - regras para novas features;
  - checklist de qualidade para PRs.

## 11. KPIs de acompanhamento (iniciado em 07/04/2026)
- Telemetria de tempo por tarefa crítica já ativa (produto, cliente, pedido, campanha).
- KPI de taxa de erro em formulário já ativo via classificação de toasts.
- KPI de conclusão em mobile adicionado (baseado em tarefas concluídas em viewport mobile).
- KPI de cliques até ação principal por módulo adicionado (tracking da CTA primária da topbar).
- KPI de uso do Centro de Notificações adicionado (executadas, resolvidas, reabertas e taxa de resolução).

## 12. Critérios de aceite por frente (iniciado em 07/04/2026)
- Auditoria por frente adicionada com comando rápido `/ auditoria aceite`, cobrindo:
  - consistência visual;
  - semântica de informação;
  - responsividade;
  - acessibilidade mínima.
- Reforços de CSS aplicados para viewport 360px+ e estabilidade de modal em telas pequenas.
- Foco visível reforçado em campos dentro de modal para reduzir risco de perda de contexto em formulário.

## 13. Atualização de metas (07/04/2026)
- A janela inicial de prazo (30 a 45 dias) foi desconsiderada.
- As metas passam a ser tratadas como acompanhamento contínuo no dashboard de KPIs.

## 14. Programa contínuo de governança (07/04/2026)
- Instituída rotina contínua de melhoria com três cadências:
  - quinzenal: governança Design + Produto + Engenharia;
  - mensal: auditoria de consistência;
  - trimestral: revisão executiva de maturidade.
- Entregáveis formalizados:
  - ritual de governança: `docs/governanca/RITUAL_GOVERNANCA_CONTINUA_UX_PRODUTO_ENG.md`;
  - backlog debt/control: `docs/governanca/BACKLOG_DEBT_CONTROL_UX_UI.md`;
  - relatório trimestral: `docs/governanca/RELATORIO_TRIMESTRAL_EVOLUCAO_TEMPLATE.md`.
