# 📋 Lista de Pendências do Sistema (Nexus Industrial)

Todas as pendências críticas de compilação, bugs de digitação do TypeScript e falhas de testes unitários foram resolvidas com sucesso! A base de código está **100% verde**.

Este documento centraliza as pendências não-impeditivas e sugestões de automação futuras para evolução contínua da plataforma.

---

## Prioridades para controle de reformas

O sistema já tem cadastro de projetos, contratos, cronograma por fase, diário de obra com fotos, aditivos, documentos e apropriação de compras e repasses. A aba Financeiro do contrato apresenta os custos mapeados e o saldo sobre o valor contratado.

1. **Orçamento e centros de custo.** Registrar o orçamento-base por etapa e natureza do custo (materiais, mão de obra própria, terceiros, equipamentos e indiretos). Vincular compras, despesas e apontamentos a obra e etapa. Permitir rateio e destacar lançamentos sem classificação.
2. **Custo e resultado.** Mostrar orçamento, custo comprometido, custo incorrido e estimativa para concluir. Conciliar compras, apropriações e pagamentos para evitar duplicidade. Comparar a margem prevista com a estimada ao término e apresentar faturado e recebido em indicadores separados.
3. **Diário de obra (RDO).** Registrar a data da execução separada da data de lançamento, etapa, equipe e horas, serviços e quantidades, materiais recebidos, impedimentos, ocorrências e fotos. Permitir revisão, aprovação e exportação pelo responsável.
4. **Mudanças e medições.** Registrar solicitação, impacto em custo e prazo, evidências e aprovação do cliente. Vincular as medições às etapas e ao faturamento para acompanhar o saldo a medir.
5. **Entrega e pós-obra.** Concentrar pendências de vistoria, aceite, documentação final e garantias com responsável e prazo.

### Vínculos e automações da obra

| Fluxo | Como funciona hoje | Próximo ajuste |
| --- | --- | --- |
| Projeto → levantamento, orçamento e pedido de venda | O perfil oferece atalhos que passam o projeto ao novo registro. | Destacar o projeto de origem e oferecer seleção quando o registro for iniciado pelo módulo geral. |
| Orçamento aprovado → contrato | A aprovação tenta criar um contrato e grava seu vínculo no orçamento. O contrato também pode nascer pelo CRM. | Exigir cliente cadastrado, permitir vincular um contrato existente e tornar a aprovação transacional e idempotente. Exibir os contratos no perfil do projeto. |
| Contrato → cronograma, diário e documentos | Esses registros são criados no contexto do contrato. | Abrir esses módulos pelo perfil do projeto e herdar a etapa quando o registro começar no cronograma. |
| Compra → custo da obra | O formulário de compra oferece vínculo com contrato. A apuração também admite apropriação por item. | Herdar o contrato quando a compra começar pela obra e oferecer centro de custo e etapa por item, com fila de compras sem classificação. |
| Marco concluído → contas a receber | O usuário confirma o faturamento no cronograma. A ação reutiliza uma cobrança já registrada e protege novas tentativas concorrentes pela chave do marco. | Adotar vencimento do contrato, conciliar a baixa com os indicadores e registrar o envio de notificação em uma fila transacional. |

O cadastro do projeto deve manter a obra pronta para receber documentos e orçamento. A aprovação comercial é o ponto para criar ou vincular o contrato, e a confirmação da medição é o ponto para gerar a cobrança. Antes de ativar essa sequência, revisar contratos e clientes criados por caminhos paralelos com base em seus vínculos de origem.

## 🟢 Status de Bloqueios Críticos
- [x] **Erros de Typecheck (`npm run typecheck`):** **0 pendências.** Todo o projeto TypeScript compila de forma limpa.
- [x] **Falhas nos Testes Unitários (`npm run test:react`):** **0 pendências.** Todos os 160 testes React passam com sucesso.
- [x] **Conectividade de Módulos:** **0 pendências.** Todos os fluxos dinâmicos do cliente e cálculos NLP locais operam de forma 100% coesa.

Para uma visão detalhada das correções aplicadas e arquitetura, consulte o [SISTEMA_AUDIT_REPORT.md](file:///Users/larrat/Sites/sistema_comercial/SISTEMA_AUDIT_REPORT.md).

---

## 📅 Próximas Etapas e Automações Sugeridas (Fila de Backlog)

### 🧪 1. Garantia de Qualidade & Testes (Quality Assurance)
- [ ] **Integração de Testes de Fumaça (E2E):** Validar os testes do Playwright (`npm run test:e2e:ui-core`) em ambientes de CI ou localmente para certificar a transição do banco de dados simulado em fluxos reais de login e boot de filial.
- [ ] **Métricas de Cobertura de Código:** Executar periodicamente `npm run test:react:coverage` para auditar a cobertura de caminhos críticos e regras de negócio no módulo de Compras e Caixa.

### ⚙️ 2. Pipelines de Integração Contínua (CI/CD)
- [ ] **Configuração do Pipeline GitHub Actions:** Configurar um arquivo `.github/workflows/ci.yml` para rodar de forma automática:
  1. Instalação limpa (`npm ci`)
  2. Verificação de formatação (`npm run format:check`)
  3. Análise estática (`npm run lint`)
  4. Typecheck rigoroso (`npm run typecheck`)
  5. Execução dos testes React (`npm run test:react`)
- [ ] **Ativação dos Git Hooks do Husky:** Configurar os scripts pré-commit locais para prevenir commits que quebrem os testes unitários ou o linter.

### 🎨 3. UX / Design System Premium
- [ ] **Padronização das Animações com Framer Motion:** Homogeneizar as micro-transições de modais (como as utilizadas nos novos modais do CRM e Contratos) em todo o sistema.
- [ ] **Auditoria de Acessibilidade (WCAG):** Revisar componentes comuns da pasta `src/react/shared/ui/` contra as diretrizes WCAG de contraste de cores e suporte à leitura de tela, reforçando o caráter premium da aplicação.
