# Plano Executivo - Fase B (UI Premium + Responsivo)

Data de início: 07/04/2026  
Status: Em andamento

## 1. Objetivo estratégico
Elevar o sistema para um padrão premium, moderno e consistente, com foco em:
- clareza visual por importância da informação;
- experiência fluida em mobile e desktop;
- aumento de produtividade operacional (menos cliques, menos erros, mais ação).

## 2. Metas de negócio (30 a 45 dias)
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

