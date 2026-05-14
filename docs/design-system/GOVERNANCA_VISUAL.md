# Governança Visual — Nexus Premium (React)

Critérios práticos de qualidade visual, checklists de PR e novas telas, seguindo o padrão **Nexus Industrial**.

**Referência de componentes:** [UI_COMPONENTS.md](./UI_COMPONENTS.md)
**Inconsistências mapeadas:** [AUDITORIA_INCONSISTENCIAS.md](./AUDITORIA_INCONSISTENCIAS.md)

---

## 💎 Definição de Pronto — UI/UX Nexus

Uma tela está **pronta** quando reflete a estética de alta fidelidade e performance do sistema.

| Critério | Padrão obrigatório |
|----------|--------------------|
| Identidade | Fundo `Midnight` (`#020617`) e acentos `Ciano` (`#06b6d4`) |
| Shell | `<main className="rf-dashboard">` ou `<div className="rf-content">` |
| Glassmorphism | Uso de `rf-glass` (blur 24px) ou `rf-glass-heavy` (blur 40px) |
| Título | `PageHeader` com Kicker uppercase e CTA Ciano |
| Listas | `FilterBar` com fundo translúcido + `DataTable` otimizado |
| Gráficos | Recharts nativo com gradientes vibrantes e tooltips premium |
| Overlays | `Drawer` com animação `framer-motion` e desfoque pesado |
| Performance | Implementação de `Suspense` e `staleTime` (> 30s) |
| Microcopy | Sem jargão técnico; foco na operação industrial |

---

## 1. Princípios Nexus

O produto é uma ferramenta de elite para operações industriais. Cada decisão visual deve satisfazer:

- **Imersivo** — O dark mode profundo e o glassmorphism reduzem o cansaço visual e destacam os dados.
- **Vibrante** — Cores críticas (faturamento, lucro, status) devem ser saturadas e brilhantes.
- **Instantâneo** — A percepção de velocidade é parte do design; nada de spinners infinitos.
- **Premium** — Detalhes como sombras sutis, bordas de 1px translúcidas e animações suaves.

---

## 2. Composição de Páginas

### Dashboard & Analytics
```
PageHeader (Premium)
StatCard Grid (com CountUp e animações)
Gráfico Recharts (Gradientes + Tooltips Custom)
DataTable / Status Distribution
```

### Página Operacional (Lista + Detalhe)
```
PageHeader (Kicker + CTA Ciano)
FilterBar (Glass effect)
DataTable (Otimizado para performance)
Premium Drawer (Abertura lateral suave)
```

---

## 3. Estados e Feedbacks (Performance)

| Estado | Como tratar |
|--------|------------|
| Carregando | `RouteLoader` temático ou Spinner Ciano circular |
| Transição | `Suspense` com fallback visual Nexus |
| Operação | Botão `disabled` + Spinner integrado — nunca `'...'` |
| Erro | Banner inline em Ciano/Rose com ação de Retry |

**Regras absolutas:**
- Tempo de resposta visual < 100ms.
- Toda lista deve ter `staleTime` configurado para evitar refetch ao navegar.

---

## 4. Hierarquia de CTAs Nexus

```
btn btn-p           → Ciano Vibrante com Glow (1 por tela)
btn btn-secondary   → Translúcido com borda sutil
btn btn-r           → Rose/Danger para ações destrutivas
```

---

## 5. Checklist — Nova Tela Nexus

- [ ] A tela usa o shell `rf-dashboard`?
- [ ] O título tem um Kicker em uppercase?
- [ ] O gráfico (se houver) usa gradientes e tooltips customizados?
- [ ] O painel lateral (Drawer) abre com animação e blur?
- [ ] A cor de acento é o Ciano Nexus (`#06b6d4`)?
- [ ] A navegação é protegida por `Suspense`?

---
*Este documento é a base para a evolução visual do Nexus Industrial. Inovações são bem-vindas, desde que mantenham o nível de fidelidade Premium.*
