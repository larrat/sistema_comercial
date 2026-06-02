# Mapa do Sistema Comercial — Nexus Industrial

Este documento fornece uma visão completa da arquitetura, fluxo e interface do sistema, permitindo análise sem necessidade de acesso direto.

---

## 1. Visão Geral (PRD)

O sistema é uma plataforma de gestão comercial robusta projetada para operações industriais e de atacado sob a marca **Nexus Industrial**. Ele foca em três pilares: **Controle de Vendas**, **Gestão de Estoque** e **Saúde Financeira**.

### Módulos Principais
*   **Vendas (Pedidos)**: Gestão do ciclo de vida das vendas, desde o orçamento até a entrega e baixa financeira.
*   **CRM (Clientes)**: Visão 360º do cliente, incluindo histórico de compras, prazos médios e alertas de inadimplência.
*   **Logística (Produtos & Estoque)**: Catálogo com controle de margens (markup), gestão de estoque físico em tempo real e integração via RPA de compras.
*   **Financeiro (Contas a Receber e Pagar)**: Controle de recebíveis com fluxos de baixa, análise de inadimplência, e integração automática com Pedidos de Compra via XML.
*   **Fiscal (Governança)**: Motor tributário centralizado para cálculo de impostos (ICMS, PIS, COFINS, IVA Dual) via NCM/UF e mapeamentos de CFOP.

---

## 2. Mapa do Site e Fluxograma de Navegação

A navegação é centrada em uma barra lateral dinâmica que conecta todos os centros de controle.

```mermaid
graph TD
    A[Login] --> B[Dashboard]
    B --> C[Menu Lateral]
    C --> D[Pedidos]
    C --> E[Clientes]
    C --> F[Produtos]
    C --> G[Estoque]
    C --> H[Financeiro]
    C --> I[Compras / Importação XML]
    C --> J[Setup Fiscal]

    D --> D1[Lista de Pedidos]
    D1 --> D2[Detalhe/Edição]
    D1 --> D3[Novo Pedido]

    E --> E1[Lista de Clientes]
    E1 --> E2[Perfil do Cliente]
    E1 --> E3[Novo Cliente]

    F --> F1[Lista de Produtos]
    F1 --> F2[Detalhe/Preços]

    G --> G1[Movimentação/Histórico]
    
    I --> I1[Processamento RPA]
    I1 --> G1
    I1 --> H
```

---

## 3. Hierarquia Visual e Layout (Nexus Premium)

O sistema utiliza a estética **Nexus Premium Industrial**, caracterizada por:
- **Dark Mode Profundo**: Base em `Midnight Blue` (`#020617`).
- **Glassmorphism**: Uso intensivo de transparências e desfoque (`backdrop-blur`) em painéis e modais.
- **Destaque Ciano**: Acentuação em `Cyan Vibrante` para ações principais e indicadores de progresso.
- **Performance**: Carregamento sob demanda (Lazy Loading) para navegação instantânea.

### 3.1 Dashboard Central
O ponto de comando do gestor. Utiliza gráficos de alta fidelidade com gradientes vibrantes para faturamento e lucro.
![Dashboard Central](file:///Users/larrat/.gemini/antigravity/brain/65abc6c2-e3b1-4e54-9f60-db3bb6f3d6ac/dashboard_1778593087158.png)

### 3.2 Listagem de Pedidos
Foco em produtividade. Filtros rápidos e badges de status para identificação imediata de gargalos.
![Listagem de Pedidos](file:///Users/larrat/.gemini/antigravity/brain/65abc6c2-e3b1-4e54-9f60-db3bb6f3d6ac/pedidos_1778593111040.png)

### 3.3 Gestão de Clientes
Interface limpa que prioriza o contato e a identificação do cliente.
![Gestão de Clientes](file:///Users/larrat/.gemini/antigravity/brain/65abc6c2-e3b1-4e54-9f60-db3bb6f3d6ac/clientes_1778593141031.png)

### 3.4 Catálogo de Produtos
Exibição técnica com foco em SKU, Categorias e Status de Estoque.
![Catálogo de Produtos](file:///Users/larrat/.gemini/antigravity/brain/65abc6c2-e3b1-4e54-9f60-db3bb6f3d6ac/produtos_1778593175855.png)

---

## 4. Estrutura Técnica (Nexus Design System)

O sistema utiliza tokens semânticos baseados em variáveis CSS modernos.

**Principais Tokens de Design:**
```css
:root {
  --surface-page: #020617;    /* Fundo principal */
  --surface-card: #0f172a;    /* Fundo de cards */
  --text-accent: #06b6d4;     /* Ciano Nexus */
  --action-success: #10b981;  /* Esmeralda */
  --radius-premium: 12px;     /* Bordas refinadas */
}
```

---

## 5. Sequência de Uso Comum

1.  **Venda**: O vendedor acessa **Pedidos** -> **Novo Pedido**, seleciona o **Cliente** e os **Produtos**.
2.  **Conferência**: O gestor visualiza no **Dashboard** o impacto no faturamento em tempo real.
3.  **Financeiro**: Após a entrega, o pedido gera uma conta em **Contas a Receber**, onde é processada a baixa após o pagamento.
