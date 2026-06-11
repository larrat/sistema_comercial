# Norte do Projeto — Nexus Industrial

Atualizado em: 11/06/2026

Este é o documento executivo central. Ele diz onde o sistema está agora, quais documentos valem e quais decisões importam para continuar evoluindo sob a marca **Nexus Industrial**.

## Princípio atual

O sistema existe para operar uma loja real com excelência visual e alta performance.
Toda nova funcionalidade deve respeitar o padrão **Premium Nexus** (Glassmorphism + Cyan) e seguir as **Práticas de Engenharia (apiClient, Hooks Isolados, RBAC)**.

## Estado geral

- **Arquitetura Base**: API Client centralizado (`fetchWithAuth`) e scaffolding automatizado via `scripts/generate-module.mjs`.
- **RBAC**: Permissões baseadas em banco de dados (`hasPermission('admin')`), sem chumbamento de strings no código.
- **Projetos Hub**: O ecossistema de Projetos foi consolidado como um hub central. Agora ele concentra Vendas (Pedidos), Orçamentos e Levantamentos de Arquitetura em uma única tela fluida.
- **PDV (Ponto de Venda)**: Refatorado para _Custom Hooks_ (`usePdvEngine`, `useProductSearch`), separando regras pesadas de negócio da Interface Visual. Tipagem restrita de TypeScript está **100% livre de erros**.
- **Performance**: Implementado `Route Lazy Loading`. O sistema agora carrega instantaneamente (Bundle: 218KB).
- **UI/UX**: Consolidado o estilo **Midnight Industrial**. Dashboard refatorado com Recharts de alta fidelidade.

## Módulos

| Módulo | Status atual | Próxima ação pragmática |
|---|---|---|
| Projetos | **Hub Consolidado** | Estimular uso da tela unificada de Levantamentos e Orçamentos. |
| Dashboard | **Refatorado (Premium)** | Manutenção estética apenas. |
| Clientes | Referência de padrão | Manter como base de UX para novos cadastros. |
| Pedidos | **Refatorado (Premium)** | Automação via trigger para geração de Contas a Receber recém-implantada. |
| PDV | **Desacoplado** | Expandir relatórios gerenciais a partir das lógicas limpas do `usePdvEngine`. |
| Estoque | Ativo em React | Sincronização em tempo real com Produtos. |
| Financeiro | Ativo em Banco (Triggers) | Validar inserção massiva das triggers de faturamento. |

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

1. Monitorar o funcionamento das Triggers Financeiras (ex: `trg_pedido_to_contas_receber`) conforme o volume de vendas via PDV aumentar.
2. Utilizar o `generate-module.mjs` para qualquer criação de novos componentes, barrando PRs que façam "Ctrl+C / Ctrl+V" de módulos antigos.
3. Consolidar o sistema de RBAC migrando cargos e acessos 100% para a administração pela Interface UI (atualmente no Banco de Dados).

## O que evitar

- Reintroduzir componentes genéricos que quebrem a estética Premium.
- Adicionar bibliotecas pesadas sem análise de impacto no carregamento.
- Voltar ao padrão de cards brancos sem aprovação explícita.
