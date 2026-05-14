# 7. Auditoria e Histórico (Legacy & Evolution)

Este capítulo descreve a rastreabilidade das decisões de engenharia e as políticas de transição de dados para o ecossistema **Nexus Industrial**.

---

## 7.1. Registro de Decisões de Arquitetura (ADRs)

Para garantir que a evolução do sistema seja fundamentada em lógica e não em conveniência momentânea, adotamos o padrão de **Architectural Decision Records (ADRs)**.

*   **Repositório de Decisões**: Localizado em `docs/arquitetura/`, cada decisão crítica (ex: Escolha do Supabase sobre PostgreSQL puro, adoção do React 19) é documentada em formato Markdown.
*   **Conteúdo da ADR**:
    *   **Contexto**: O problema ou necessidade identificada.
    *   **Decisão**: A tecnologia ou padrão escolhido.
    *   **Consequências**: Os ganhos e as dívidas técnicas aceitas com a escolha.

---

## 7.2. Migração e Descontinuação de Legado

O **Nexus Industrial** substitui fluxos manuais e ferramentas legadas (ex: Planilhas de controle e protótipos em AppSheet).

*   **Estratégia de Ingestão**: Os dados históricos de vendas e clientes são normalizados e importados para o PostgreSQL via scripts de migração em massa (Bulk Import), passando por validações de esquema para evitar "poluição" de dados no novo sistema.
*   **Decommissioning**: Após o período de *warm-up* (validado em 30 dias de uso em paralelo), as ferramentas legadas são desativadas, tornando o Nexus Industrial a **Fonte Única da Verdade (SSoT)**.

---

## 7.3. Auditoria de Transações Sensíveis

Além do controle de exclusão (Soft Delete), o sistema monitora ações de alto risco que podem indicar fraudes ou erros operacionais críticos.

### Eventos Monitorados (Log Absoluto)
Qualquer alteração nos itens abaixo dispara um registro imediato na tabela de auditoria, contendo o ID do autor, Timestamp e o Delta (antes/depois):

1.  **Estornos e Cancelamentos**: Vendas liquidadas via PIX ou Cartão que sofrem estorno manual.
2.  **Alçada de Crédito (Fiado)**: Qualquer modificação no limite de crédito de um cliente ou na flag de inadimplência.
3.  **Ajustes de Inventário Manuais**: Alterações de saldo de estoque que não possuem uma Ordem de Compra ou Pedido de Venda vinculado.
4.  **Sobrescrita de Preço (Price Override)**: Vendas finalizadas com valor diferente do Markup base calculado pelo Produto Pai.

---
**Status da Documentação**: Atualizada e Auditada.
