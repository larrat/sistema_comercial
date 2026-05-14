# 1. Visão Geral e Governança (Overview & Compliance)

Este capítulo descreve a fundação estratégica e as diretrizes de conformidade que regem o sistema **Nexus Industrial**.

---

## 1.1. Propósito e Missão do Sistema

O **Nexus Industrial** atua como o núcleo operacional e estratégico (ERP/CRM) para a gestão inteligente do ambiente de varejo e atacado. A missão central da plataforma é unificar, rastrear e automatizar todo o ciclo de vida comercial — desde a aquisição de mercadorias junto a fornecedores até a conversão no PDV (Ponto de Venda) e rotinas de pós-venda.

Para viabilizar o crescimento escalável do negócio, o sistema elimina processos manuais e garante a integridade de dados nas seguintes frentes:

*   **Inteligência de Vendas e CRM**: Criação de perfis detalhados de clientes, rastreamento de comportamento de compra e métricas de retenção, possibilitando campanhas direcionadas.
*   **Gestão de Inventário e Supply Chain**: Automação de fluxos de entrada, movimentação física e lógica, controle de grades (SKUs complexos) e baixas automatizadas atreladas à venda.
*   **Business Intelligence (BI)**: Geração de relatórios analíticos em tempo real para identificação de *top-sellers*, análise de ticket médio e auditoria completa de transações para decisões *data-driven*.

---

## 1.2. Stakeholders e Níveis de Serviço (SLA)

### Perfis de Stakeholders
*   **Administração / Proprietário**: Foco em saúde financeira e dashboards estratégicos.
*   **Time de Vendas / Atendimento**: Foco em agilidade no PDV e consulta de estoque em tempo real.
*   **Operação de Estoque**: Foco em processos de entrada (XML/NFe), balanços e transferências.
*   **Financeiro**: Foco em conciliação de caixa, gestão de recebíveis e contas a pagar.

### Acordos de Nível de Serviço (SLAs)
*   **Disponibilidade (Uptime)**: O módulo de Vendas (PDV) é classificado como **Missão Crítica**, com meta de disponibilidade de **99.9%** em horário comercial.
*   **Latência**: O tempo de resposta para consultas de estoque e finalização de checkout deve ser inferior a **500ms**.
*   **Integridade e Rastreabilidade**: É proibida a exclusão física de registros transacionais. O sistema adota a política de **Soft Delete** para garantir trilhas de auditoria imutáveis.

---

## 1.3. Matriz de Responsabilidades (RACI / RBAC)

O controle de acesso é regido pelo modelo **RBAC (Role-Based Access Control)**:

| Perfil | Responsabilidades Principais | Restrições Críticas |
| :--- | :--- | :--- |
| **Administrador** | Gestão total, definição de margens e usuários. | Nenhuma. |
| **Gerente** | Aprovação de descontos, cancelamentos e estornos. | Não altera configurações globais de sistema. |
| **Vendedor** | Vendas, CRM e orçamentos. | Sem acesso a custos de aquisição ou relatórios financeiros. |
| **Estoquista** | Entrada de NFe, avarias e inventário. | Sem acesso a base de clientes ou dados de venda. |

---

## 1.4. Glossário de Termos de Negócio

*   **Grade de Produtos**: Agrupamento de variações de um modelo base (Cor/Tamanho), gerando SKUs únicos.
*   **Liquidação**: Confirmação efetiva do recebimento financeiro de uma transação.
*   **Baixa de Estoque**: Redução lógica da quantidade disponível disparada por evento de venda ou perda.
*   **Markup**: Índice multiplicador aplicado sobre o custo de aquisição para definição do preço de venda.
*   **Curva ABC**: Classificação de criticidade de itens baseada em volume de saída e rentabilidade.
*   **Soft Delete**: Marcação lógica de inatividade de um registro, preservando o dado no banco para fins de auditoria.
