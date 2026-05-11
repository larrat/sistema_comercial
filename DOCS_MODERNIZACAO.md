# Documentação de Modernização - Dashboard Executivo

Este documento serve como guia para as mudanças realizadas no sistema de design do Dashboard entre Maio de 2024.

## 🎨 Design System: "Industrial Premium"

A nova interface foi construída sobre os pilares de **robustez, precisão e sobriedade**.

### 1. Paleta de Cores (Tailwind/Custom)

- **Base:** `slate-50` (Fundo), `slate-900` (Textos principais).
- **Ação Primária:** `slate-900` com hover `slate-800`.
- **Destaque Financeiro (Matte Gold):** `#C5A059` - Usado em Pacing, Faturamento e destaques executivos.
- **Sucesso (Military Green):** `#4B5320` - Usado em Margem, Lucro e indicadores positivos.
- **Alertas:** `rose-500` (Churn/Crítico), `amber-500` (Atenção).

### 2. Geometria e Espaçamento (Padrões Críticos)

Para manter o aspecto premium, é fundamental seguir estas regras de respiro:

- **Arredondamento Padrão:** `rounded-xl` (12px) para cards grandes; `rounded-lg` (8px) para botões e controles internos.
- **Padding de Contêiner:** Mínimo de `p-10` (40px) no mobile e `p-14` (56px) no desktop.
- **Contenção:** Sempre utilizar `overflow-hidden` em elementos com `rounded-xl` para evitar bleeding de conteúdo.

## 🏗️ Estrutura de Componentes

### DashboardPilotPage

O componente principal foi reorganizado em:

1. **Header Executivo:** Agrupa Título, Filial e Período no quadrante superior esquerdo.
2. **DashboardRoleSummary (Dark Card):** Painel de contexto dinâmico por cargo (Operação/Gestão/Adm).
3. **DashKpis (Grid):** Conjunto de `StatCards` com indicadores de performance.
4. **DashboardInsightGrid:** Cards auxiliares para CRM e Catálogo.

## 🧮 Lógica e Dados

- **Pluralização:** Utilizar a função helper `plural(count, singular, plural)` para garantir concordância gramatical na UI.
- **Precisão:** Pacing e indicadores percentuais devem sempre exibir 1 casa decimal (`toFixed(1)`).
- **Tradução:** Filiais devem ser resolvidas via `currentFilialName` (Auth API) para evitar a exibição de IDs técnicos.

---

_Modernização realizada por Antigravity AI._
