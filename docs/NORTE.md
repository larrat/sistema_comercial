# Norte do Projeto — Nexus Industrial

Atualizado em: 14/05/2026

Este é o documento executivo central. Ele diz onde o sistema está agora, quais documentos valem e quais decisões importam para continuar evoluindo sob a marca **Nexus Industrial**.

## Princípio atual

O sistema existe para operar uma loja real com excelência visual e alta performance.
Toda nova funcionalidade deve respeitar o padrão **Premium Nexus** (Glassmorphism + Cyan).

## Estado geral

- **Performance**: Implementado `Route Lazy Loading`. O sistema agora carrega instantaneamente (Bundle: 218KB).
- **UI/UX**: Consolidado o estilo **Midnight Industrial**. Dashboard refatorado com Recharts de alta fidelidade.
- **TanStack Query**: Otimização global de cache (`staleTime`) para navegação sem delays.
- **Clientes**: Tela de referência absoluta de UX/UI para cadastros.
- **Produtos**: Alinhado ao padrão de Clientes, com foco em gestão de margens.

## Módulos

| Módulo | Status atual | Próxima ação pragmática |
|---|---|---|
| Dashboard | **Refatorado (Premium)** | Manutenção estética apenas. |
| Clientes | Referência de padrão | Manter como base de UX para novos cadastros. |
| Pedidos | **Refatorado (Premium)** | Validar novos fluxos de baixa e entrega. |
| PDV | Ativo em React | Refinar busca rápida de itens. |
| Estoque | Ativo em React | Sincronização em tempo real com Produtos. |
| Financeiro | Ativo em React | Validar conciliação bancária automática. |

## UX/UI (Nexus Standard)

### Padrão Ativo
- **PageHeader**: Títulos fortes com Kickers uppercase.
- **StatCard**: Métricas com animações de contagem.
- **Premium Drawer**: Painéis laterais com `framer-motion` e desfoque.
- **Charts**: Gradientes vibrantes e tooltips de alta precisão.

### Referências
- [MAPA_DO_SISTEMA.md](MAPA_DO_SISTEMA.md)
- [PADRAO_TELA_CLIENTES.md](PADRAO_TELA_CLIENTES.md)

## Próximas decisões úteis

1. Monitorar performance do Bundle conforme novas features são adicionadas.
2. Expandir o uso de Recharts para o módulo de Relatórios.
3. Padronizar o PDV com o tema Midnight/Cyan.

## O que evitar

- Reintroduzir componentes genéricos que quebrem a estética Premium.
- Adicionar bibliotecas pesadas sem análise de impacto no carregamento.
- Voltar ao padrão de cards brancos sem aprovação explícita.
