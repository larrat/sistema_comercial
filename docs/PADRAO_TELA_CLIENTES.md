# Padrão de Tela — Clientes (Nexus Premium)

Última atualização: 14/05/2026
Referência principal: Tela de Clientes em React.

Este documento define o padrão visual e funcional **Nexus Premium Industrial** que deve ser usado como referência para todas as telas do sistema.

## 🌌 Ideia Central: Nexus Industrial

O sistema não deve apenas funcionar; ele deve impressionar pela velocidade e beleza.
- **Identidade**: Fundo Midnight (`#020617`), acentos em Ciano (`#06b6d4`).
- **Profundidade**: Uso de `backdrop-blur` (24px a 40px) para criar camadas visuais.
- **Fluidez**: Animações de entrada em todos os componentes principais.

## 🏗️ Estrutura Padrão da Tela de Lista

1. **PageHeader Premium**: Kicker em uppercase, título forte e botão de ação principal (Ciano).
2. **KPI Bar**: Uso de `rf-dash-card` para métricas rápidas no topo da lista.
3. **FilterBar Glass**: Barra de busca com transparência e filtros por segmentos.
4. **DataTable**: Listagem com tipografia clara e menu de ações `ActionMenu`.

## 🪟 Componentes de Interação (Drawer 2.0)

A partir de Maio/2026, todos os cadastros devem usar o **Drawer Premium**:
- **Abertura**: Transição suave via `framer-motion`.
- **Estilo**: Fundo semi-transparente com desfoque pesado (`blur(40px)`).
- **Ações**: Botões de salvar destacados e botão de fechar (X) acessível.

## 📊 Gráficos e Dados

Sempre que houver análise de dados, seguir o padrão do Dashboard:
- **Engine**: Recharts nativo.
- **Estilo**: Gradientes vibrantes (Âmbar para faturamento, Esmeralda para lucro).
- **Tooltips**: Cards de vidro com informações de alta precisão.

## 🏁 Checklist Nexus Premium

- [ ] A tela usa o fundo `Midnight`?
- [ ] A ação principal é `Ciano` vibrante?
- [ ] Os painéis laterais (Drawers) usam `blur` e animação?
- [ ] O carregamento é instantâneo (estratégia de `Suspense`)?
- [ ] As legendas dos gráficos estão com `margin` e tipografia `font-black`?

---
*Este padrão é a lei visual do sistema. Adaptar para cada módulo, mas nunca quebrar a essência Premium.*
