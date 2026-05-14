# 2. Regras de Negócio e Casos de Uso (Business & Domain)

Este capítulo detalha a lógica operacional, os estados de transição de dados e as políticas comerciais que sustentam o ecossistema **Nexus Industrial**.

---

## 2.1. Ciclo de Vida do Pedido (Operação Just-in-Time)

O sistema adota um modelo operacional baseado em estoque sob demanda (**JIT**), onde a venda precede a posse física do item. O fluxo é regido por uma máquina de estados assíncrona:

1.  **Captação e Orçamento (Draft)**: O fluxo inicia no catálogo virtual. O pedido é registrado como "Orçamento", sem reserva de saldo ou impacto financeiro.
2.  **Validação de Estoque Externo (Supplier Check)**: Etapa de verificação de disponibilidade junto ao fornecedor parceiro para a variante (SKU) específica.
3.  **Conversão (Order Placed)**: Com a confirmação, o orçamento torna-se um "Pedido de Venda". O sistema gera automaticamente uma Ordem de Compra (**Inbound**) correspondente.
4.  **Checkout & Entrega (Faturamento)**: Após o recebimento da mercadoria (Cross-docking), o pedido avança para roteirização e entrega, disparando a liquidação financeira.

---

## 2.2. Motor de Precificação e Descontos

A arquitetura de preços utiliza o modelo **Cost-Plus Pricing** com alçadas de decisão centralizadas.

*   **Markup Fixo**: O Preço de Venda (PV) é derivado do Custo de Aquisição (CA) via índice multiplicador. Despesas logísticas são absorvidas pela margem global na versão atual.
*   **Alçada de Desconto (Owner Override)**: Não existem regras de promoção automáticas. Descontos exigem aprovação discricionária do perfil **Administrador**, que possui permissão de sobreposição de valor no checkout.
*   **Liquidação de Mostruário (Sample Clearance)**: Peças de ensaio (open-box) são marcadas com a flag `is_sample: true`, permitindo precificação isolada das regras do Produto Pai.

---

## 2.3. Gestão de Inventário e Grade (Modelo Pai e Filho)

A estrutura de catálogo segue o padrão **Parent-Child Hierarchy**, garantindo herança de atributos e integridade de SKUs.

*   **Produto Pai (Master Entity)**: Agrupador lógico. Retém Markup, Fornecedor, Categoria e Descritivos Globais.
*   **Produto Filho (SKU/Variante)**: Entidade comercializável. Herda regras de preço do Pai, mas possui atributos físicos únicos (Cor, Tamanho, Estampa).
*   **Movimentação de Estoque**:
    *   **Entrada (Inbound)**: Incremento de saldo vinculado exclusivamente à conclusão da Ordem de Compra.
    *   **Saída (Outbound)**: Baixa lógica disparada no momento da entrega final ao cliente.

---

## 2.4. Fluxo de Recebíveis e Regras de Inadimplência

Checkout multi-meios com suporte a **Split Payments** (composição de métodos de pagamento em uma única transação).

*   **Liquidação Imediata**: Integração com gateways para PIX e Cartões com provisionamento automático de recebíveis.
*   **Crediário Próprio (Crédito Interno)**:
    *   **Limite de Crédito**: Atribuído manualmente pelo perfil Administrador.
    *   **Bloqueio Automático**: Clientes com títulos vencidos recebem a flag `is_defaulter: true`. O sistema impede novas vendas a prazo para este CPF até a regularização do débito.

---

## 2.5. Gestão de Relacionamento (CRM) e Fidelização

*   **Customer 360**: Visão consolidada de histórico transacional, ticket médio e preferências de grade.
*   **Tagging por Origem (ROI)**: Rastreamento da origem do cliente para medição de eficácia em ações de marketing (ex: parcerias esportivas ou eventos).
*   **Régua de Pós-Venda**: Gatilhos temporais para contato de feedback (7 dias), reativação de clientes inativos (90 dias) e ações de aniversário.
