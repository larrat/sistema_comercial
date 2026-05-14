# UI Components — Guia Nexus Premium

Componentes compartilhados em `src/react/shared/ui/`. Focados em estética industrial de alta fidelidade.

---

## 🎨 Componentes de Visualização

### `PremiumAreaChart` (Recharts)
Componente de alta fidelidade para gráficos de faturamento e lucro.
- **Destaque**: Usa gradientes vibrantes e tooltips em vidro.
- **Implementação**: Localizado em `DashboardPilotPage.tsx` (estilo Recharts nativo).

### `StatCard`
Card de métrica com animação de contagem.
- **Animação**: Usa `react-countup` para entrada dinâmica.
- **Estilo**: Bordas com glow e tipografia font-black.

---

## 🏗️ Componentes de Estrutura

### `PageHeader` (Nexus Style)
```tsx
<PageHeader
  kicker="Operações"        // Uppercase, tracking-widest
  title="Dashboard"
  actions={<Button ... />}  // Destaque Ciano
/>
```

### `Premium Drawer` (Drawer 2.0)
Painel lateral com `framer-motion`.
- **Blur**: `backdrop-blur(40px)`.
- **Animação**: Entrada elástica (`spring`) a partir da direita.
- **Uso**: Cadastro de RCAs, Campanhas e Edição rápida.

### `FilterBar Glass`
Barra de filtros com efeito de vidro.
- **Estilo**: `background: rgba(255,255,255,0.03)` + `blur`.

---

## 🔄 Componentes de Estado

### `LoadingState` (Nexus Spinner)
- **Visual**: Spinner circular ciano com rastro translúcido.
- **Uso**: Automático em `DataTable` e trocas de rota via `RouteLoader`.

### `DataTable`
- **Otimização**: Suporte a skeleton loading e empty states temáticos.
- **Scroll**: Custom scrollbar invisível (`scrollbar-hide`).

---

## 📐 Princípios de Implementação

1. **Tokens Semânticos**: Nunca use cores fixas; use `--surface-page`, `--text-accent`, etc.
2. **Framer Motion**: Use para todas as transições de entrada de componentes importantes.
3. **Responsive Container**: Gráficos devem sempre estar dentro de `ResponsiveContainer`.
4. **Z-Index**: Modais e Drawers seguem a hierarquia de camadas Nexus (Overlay > Sidebar > Topbar).

---
*Para novos componentes, consulte a Governança Visual.*
