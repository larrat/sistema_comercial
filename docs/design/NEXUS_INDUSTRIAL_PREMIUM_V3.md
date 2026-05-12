# Nexus Industrial Premium v3 — Design Guidelines

Este documento serve como a **Fonte da Verdade (SSoT)** para a identidade visual v3 do sistema Nexus Industrial.

---

## 1. Identidade Visual (Visual Identity)

### Paleta de Cores
*   **Primária (Sidebar)**: `#0F172A` (Slate Dark).
*   **Acento (Accent)**: `#C5A059` (Ouro Industrial) para botões de ação principal e destaques.
*   **Superfícies (Surfaces)**:
    *   Fundo do App: `#F8FAFC` (Cinza Ártico).
    *   Cards/Painéis: `#FFFFFF` (Branco Puro).
*   **Semântica**:
    *   Sucesso: `#10B981`
    *   Erro: `#EF4444`
    *   Alerta: `#F59E0B`

### Tipografia
*   **Família**: `Manrope` ou `Inter` (Sans-serif moderna).
*   **Hierarquia**:
    *   Títulos: Semi-Bold ou Bold.
    *   Métricas (KPIs): Extra-Bold para impacto máximo.
    *   Labels: Uppercase com letter-spacing suave.

### Arredondamento (Border Radius)
*   **Padrão**: `12px` (0.75rem) para todos os cards, botões e campos de entrada.

---

## 2. Estética "High-Performance Glass" (v3)

O diferencial da v3 é o uso de camadas e transparências para criar profundidade técnica.

*   **Glassmorphism**:
    *   Background: `rgba(255, 255, 255, 0.85)` (Cards) ou `rgba(255, 255, 255, 0.9)`.
    *   Filtro: `backdrop-filter: blur(12px)`.
*   **Bordas**:
    *   Bordas ultra-finas de `1px` em `rgba(255, 255, 255, 0.3)` ou `#E2E8F0`.
*   **Sombras (Depth)**:
    *   Utilizar `shadow-sm` para elevação básica e `shadow-md` para elementos interativos.

---

## 3. Estrutura de Layout (Shell)

### Sidebar
*   Fixa à esquerda.
*   Cor: `#0F172A`.
*   Ícones: Lineares (Material Symbols / Lucide).
*   Indicador Ativo: Ouro Industrial (`#C5A059`).

### TopBar
*   Fundo translúcido (Glassmorphism).
*   Busca global alinhada à esquerda.
*   Perfil e notificações à direita.

### Área de Conteúdo
*   Grid de colunas flexível.
*   Espaçamento padrão (`gap`): `24px`.

---

## 4. Diretrizes para IA (Prompt de Estilo)

> "Atue como um designer UI sênior para o sistema 'Nexus Industrial'. Reclame o padrão visual 'Industrial Premium v3'. O design deve ter:
> * Sidebar escura (#0F172A) com acentos em ouro (#C5A059).
> * Estética Glassmorphism: Cards com fundo branco translúcido, blur de fundo e bordas sutis.
> * Tipografia Manrope, foco em legibilidade de dados densos e KPIs destacados.
> * Componentes: Gráficos de tendência, alertas preditivos e tabelas com estados semânticos claros."
