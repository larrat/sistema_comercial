# Norte do Projeto — Sistema Comercial

Atualizado em: 2026-05-06

Este é o documento executivo central. Ele diz onde o sistema está agora, quais documentos valem e quais decisões importam para continuar evoluindo sem virar reforma infinita.

Para análise detalhada, use [status/STATUS_GERAL_2026-05-06.md](status/STATUS_GERAL_2026-05-06.md).

## Princípio atual

O sistema existe para operar uma loja real.
A próxima mudança deve resolver uma dor concreta de uso, não completar uma lista abstrata de governança.

## Estado geral

- A aplicação principal está em React dentro de `src/react`.
- Todas as rotas principais do menu têm página React.
- Clientes é a tela de referência de UX/UI.
- Produtos foi alinhado ao padrão de Clientes, com página própria de detalhe/edição.
- O legado ainda existe no repositório, mas não é a referência para evolução de produto.
- Banco/RLS/RBAC têm base robusta em SQL, mas algumas implantações precisam ser confirmadas em produção antes de serem marcadas como concluídas.

## Módulos

| Módulo | Status atual | Próxima ação pragmática |
|---|---|---|
| PDV | Ativo em React | Refinar busca de produto e atalhos se atrapalhar atendimento. |
| Dashboard | Ativo em React | Só refatorar se manutenção ficar custosa. |
| Clientes | Referência de padrão | Manter como base de UX para cadastros importantes. |
| Produtos | Alinhado ao padrão Clientes | Validar em produção a página de detalhe/edição. |
| Pedidos | Ativo em React | Padronizar visual apenas se o fluxo atual atrapalhar operação. |
| Contas a receber | Ativo em React | Validar RPCs financeiras em ambiente real. |
| Estoque | Ativo em React | Manter integração com Produtos e PDV. |
| Cotação | Ativo em React | Validar fluxo real de importação/tabela antes de expandir. |
| Vendedores/RCAs | Ativo em React | Baixa prioridade; CRUD simples. |
| Relatórios | Ativo em React | Melhorar só se o relatório real pedido pela loja exigir. |
| Campanhas | Ativo em React | Confirmar deploy/uso real da Edge Function antes de declarar completo. |
| Analytics | Protótipo técnico | Não tratar como módulo operacional até trocar mocks por dados reais. |
| Filiais | Ativo em React | Sem prioridade imediata. |
| Acessos | Placeholder React | Decidir se conclui agora ou mantém congelado. |

## Banco e backend

| Área | Estado |
|---|---|
| RLS base | Scripts existentes em `sql/01*` e `sql/02*`. |
| RBAC v1/v2 | Scripts existentes em `sql/03*`, `sql/04*`, `sql/05*`, `sql/06*`. Confirmar produção antes de marcar tudo como concluído. |
| Clientes/fidelidade | Scripts `sql/10`, `sql/11`, `sql/12`. |
| Contas a receber | Scripts `sql/13`, `sql/15`, `sql/16`; RPCs críticas precisam validação real. |
| Produtos variantes | Script `sql/14`. |
| Pedidos/PDV | Scripts `sql/07`, `sql/08`, `sql/17`. |
| Edge Functions | Acessos e Campanhas existem em `supabase/functions`; deploy precisa confirmação externa. |

## UX/UI

### Padrão ativo

- `PageHeader` no topo.
- `StatCard` para métricas.
- `FilterBar` para busca/filtros.
- `DataTable` ou cards em lista.
- `Modal` para confirmação.
- `Drawer` para criação/edição rápida quando fizer sentido.
- Página própria para detalhe rico, seguindo Clientes e Produtos.

### Referências

- [PADRAO_TELA_CLIENTES.md](PADRAO_TELA_CLIENTES.md)
- [design-system/UI_COMPONENTS.md](design-system/UI_COMPONENTS.md)
- [design-system/GOVERNANCA_VISUAL.md](design-system/GOVERNANCA_VISUAL.md)

## Documentos ativos

| Tipo | Documento |
|---|---|
| Índice | [README.md](README.md) |
| Plano enxuto | [PLANO_SIMPLES.md](PLANO_SIMPLES.md) |
| Status atual | [status/STATUS_GERAL_2026-05-06.md](status/STATUS_GERAL_2026-05-06.md) |
| Organização dos docs | [ORGANIZACAO_DOCUMENTACAO.md](ORGANIZACAO_DOCUMENTACAO.md) |
| Padrão de tela | [PADRAO_TELA_CLIENTES.md](PADRAO_TELA_CLIENTES.md) |

## Documentos históricos

Os documentos antigos em `docs/governanca/STATUS_REAL_*`, planos de sprint e checklists de execução continuam no repositório, mas não são a fonte principal do estado atual.

Regra: se houver conflito, vale este `NORTE.md` e o snapshot mais recente em `docs/status/`.

## Próximas decisões úteis

1. Validar Produtos em produção após a criação da página própria.
2. Validar RPCs de Contas a Receber.
3. Decidir se Acessos será finalizado agora ou deixado como placeholder.
4. Só depois disso avaliar padronização de Pedidos.

## O que evitar

- Reabrir migração legado → React como projeto amplo.
- Criar novos documentos de governança sem uma decisão prática.
- Padronizar todos os módulos ao mesmo tempo.
- Mexer em banco sem plano de validação e rollback.
