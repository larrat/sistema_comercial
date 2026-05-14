# Nexus Industrial Premium v4 — Design Guidelines

Este documento serve como a **Fonte da Verdade (SSoT)** para a identidade visual **v4** (Nexus Premium Industrial).

---

## 1. Identidade Visual (Nexus Core)

### Paleta de Cores
*   **Fundo (Background)**: `#020617` (Midnight Blue).
*   **Acento (Accent)**: `#06b6d4` (Cyan Vibrante) para CTAs e indicadores de progresso.
*   **Superfícies (Surfaces)**:
    *   Cards: `#0f172a` (Deep Slate) com transparência.
    *   Painéis: `rgba(15, 23, 42, 0.8)` com desfoque de fundo.
*   **Semântica**:
    *   Sucesso (Lucro): `#10B981` (Emerald).
    *   Alerta (Faturamento): `#F59E0B` (Amber).
    *   Erro (Crítico): `#F43F5E` (Rose).

### Tipografia
*   **Família**: `Manrope` ou `Inter`.
*   **Estilo**:
    *   Kickers: Uppercase, tracking amplo, font-black.
    *   Métricas: CountUp animado, font-bold.

---

## 2. Estética "Industrial Glow" (v4)

O diferencial da v4 é o uso de **Glow** e **Glassmorphism Profundo**.

*   **Glassmorphism**:
    *   Overlay/Drawers: `backdrop-filter: blur(40px)`.
    *   Cards: `backdrop-filter: blur(24px)`.
*   **Glow (Brilho)**:
    *   Indicadores críticos possuem `box-shadow: 0 0 15px rgba(...accent...)`.
*   **Bordas**:
    *   Linhas ultra-finas (1px) em `rgba(255, 255, 255, 0.05)`.

---

## 3. Estrutura de Layout (Shell)

### Sidebar
- Integrada ao fundo Midnight.
- Hover states em Ciano sutil.
- Sem seletor de filial (movido para Topbar).

### Topbar
- Fundo translúcido com `backdrop-blur(16px)`.
- Seletor de filial (`FilialSwitcher`) destacado à direita.

### Gráficos (Data Viz)
- **Engine**: Recharts.
- **Visual**: Gradientes lineares (Faturamento: Amber, Lucro: Emerald).
- **Tooltips**: Cards flutuantes com `rf-glass-heavy`.

---

## 4. Diretrizes para IA (Prompt Nexus v4)

> "Atue como um UI/UX Designer de elite para o sistema 'Nexus Industrial'. Aplique o padrão 'v4 Premium'.
> - Fundo Midnight (#020617), Acentos Ciano (#06b6d4).
> - Estética: Glassmorphism profundo, bordas de 1px translúcidas, animações spring.
> - Componentes: Gráficos com gradientes vibrantes, metric cards com glow e navegação instantânea via Suspense."
