# Status Geral do Sistema — 2026-05-06

Este documento é o snapshot atual do sistema comercial com base no código presente no repositório em 06/05/2026.
Ele substitui, como referência principal, os snapshots antigos de `docs/governanca/STATUS_REAL_*`.

## Resumo executivo

O sistema está em uma fase operacional avançada: a aplicação principal já roda em React com rotas protegidas, layout com sidebar/topbar, autenticação, seleção de filial, módulos de cadastro, venda, financeiro, estoque, campanhas e relatórios.

A maior mudança em relação aos documentos antigos é que Cotação, Relatórios, RCAs e Campanhas já possuem páginas React. Portanto, eles não devem mais ser tratados como "legado puro" nos documentos ativos.

O legado ainda existe em `src/app`, `src/features`, `src/core`, `src/shared` e `src/pilot`, mas hoje ele deve ser visto como compatibilidade, ponte ou histórico. Para evolução de produto, a referência principal deve ser `src/react`.

## Estado das telas

| Área | Rota | Estado atual | Observação |
|---|---|---|---|
| PDV | `/app/pdv` | Ativo em React | Fluxo operacional forte; ainda cabe refino de busca de produto e atalhos. |
| Dashboard | `/app/dashboard` | Ativo em React | Tela rica, mas grande; risco principal é manutenção visual e tamanho do componente. |
| Clientes | `/app/clientes` e `/app/clientes/:clienteId` | Referência de padrão | Melhor tela do sistema: lista, filtros, drawer, perfil em página própria, abas e cadastro editável. |
| Produtos | `/app/produtos` e `/app/produtos/:produtoId` | Alinhado ao padrão de Clientes | Lista com ação única, métricas lado a lado e página própria de detalhe/edição. |
| Pedidos | `/app/pedidos` e `/app/pedidos/:pedidoId` | Referência de padrão | Lista, detalhe em página própria, drawer, formulário e modais padronizados; normalização de itens preparada com fallback. |
| Contas a receber | `/app/receber` | Ativo em React | Tem métricas, filtros, detalhes e modais; depende de validação real das RPCs financeiras. |
| Estoque | `/app/estoque` | Ativo em React | Módulo consistente, com posição, histórico e movimentação por modal. |
| Cotação | `/app/cotacao` | Ativo em React | Possui abas de fornecedores, importação e tabela. |
| Vendedores/RCAs | `/app/rcas` | Ativo em React | CRUD simples; ainda pode evoluir visualmente para DataTable/cards mais padronizados. |
| Relatórios | `/app/relatorios` | Ativo em React | Abas de performance, clientes e oportunidades; algumas tabelas ainda são específicas. |
| Campanhas | `/app/campanhas` | Ativo em React | Fluxo com fila WhatsApp, histórico e preview; alguns modais ainda são locais. |
| Analytics | `/app/analytics` | Protótipo técnico | Usa dados mock; não tratar como módulo operacional real ainda. |
| Filiais | `/app/filiais` | Ativo em React | Admin-only; tela simples e adequada. |
| Acessos | `/app/acessos` | Placeholder | Página existe, mas o módulo ainda está em implantação. |
| Login/Setup | `/login`, `/setup` | Ativos | Fluxos de autenticação e primeira filial. |

## Estado UX/UI

### Referências boas

- Clientes é o padrão mais completo para lista, detalhe e edição.
- Produtos agora segue o mesmo padrão geral de Clientes.
- Pedidos agora segue o padrão Clientes/Produtos para lista, detalhe, drawer, formulário e modais.
- Estoque usa bem `PageHeader`, `StatCard`, `DataTable`, `Modal` e estados de feedback.
- Contas a receber já usa componentes compartilhados e modais de confirmação.

### Dívidas visuais principais

- Campanhas ainda usa modais locais em parte do fluxo.
- RCAs e Relatórios podem padronizar melhor listas/tabelas.
- Analytics ainda é mock e não deve influenciar decisões de produto.
- Algumas telas grandes concentram muita regra e UI no mesmo arquivo.

## Estado das regras de negócio

### Clientes

- Cadastro com validação local de nome, e-mail e opt-ins.
- Perfil agrega pedidos, financeiro, notas e cadastro.
- Identidade única e fidelidade têm suporte SQL específico.

### Produtos

- Cadastro calcula preços a partir de custo, markup, margem e preço fixo.
- Produtos podem ter variantes via `produto_pai_id`.
- Detalhe em página própria mostra custo, varejo, atacado, saldo e cadastro.

### Pedidos / PDV

- Pedidos têm fluxo de criação, edição, cancelamento e detalhes.
- PDV possui carrinho, cliente, pagamento, comprovante e metadados próprios.
- `pedidos.itens` segue como agregado legado de compatibilidade.
- `pedido_itens` foi preparada para leitura normalizada com fallback e dual-write do PDV por flag; aplicação/validação em homologação ainda precisa confirmação.

### Contas a receber

- Contas possuem baixas parciais e consistência por RPCs SQL.
- A regra financeira crítica deve continuar no banco/RPC, não só no frontend.
- Pendência importante: validar RPCs em produção ou ambiente real.

### Estoque

- Movimentações ajustam posição de estoque.
- Há confirmação para ajuste sensível.
- Produto e movimentações são integrados com a rota de Produtos.

### Campanhas

- Campanhas possuem elegibilidade de aniversário e geração de fila.
- Edge Function `campanhas-gerar-fila` existe no repositório.
- Necessário confirmar deploy e uso real antes de declarar produção completa.

### Acessos/RBAC

- Existem SQLs e Edge Functions para RBAC, leitura administrativa, escrita administrativa e convite.
- A página React de Acessos ainda está em implantação.
- Produção deve ser confirmada antes de marcar RBAC v2/auditoria como concluído.

## Banco e backend

### SQL existente

| Faixa | Tema |
|---|---|
| `01`, `01b`, `02` | Alinhamento de schema e RLS. |
| `03`, `03b`, `04`, `04b`, `05`, `05b`, `06` | RBAC, auditoria e funções administrativas. |
| `07`, `08`, `17`, `18` | Pedidos, metadados de PDV e normalização de itens. |
| `10`, `11`, `12` | Clientes, fidelidade e RCAs. |
| `13`, `15`, `16` | Contas a receber, baixas parciais e RPCs de consistência. |
| `14` | Variantes de produto. |

### Edge Functions

- `acessos-admin`
- `acessos-admin-read`
- `acessos-admin-convite`
- `campanhas-gerar-fila`

Essas funções existem no repositório, mas o estado de deploy não pode ser inferido só pelo código local.

## Qualidade e testes

### Scripts principais

- `npm run typecheck`
- `npm run typecheck:strict`
- `npm run test:react`
- `npm run test:pilot:clientes`
- `npm run build:react`
- `npm run test:e2e:ui-core`

### CI

Existe workflow em `.github/workflows/ci.yml` com:

- Prettier check.
- ESLint.
- Typecheck permissivo.
- Typecheck strict.
- E2E UI core.
- Coverage do piloto de Clientes.

## Documentação

### Problema atual

A documentação é rica, mas tem excesso de snapshots e planos antigos em `docs/governanca`. Isso dificulta saber o que ainda vale.

### Regra nova recomendada

- `docs/NORTE.md` é a entrada executiva.
- `docs/status/STATUS_GERAL_2026-05-06.md` é o snapshot atual.
- `docs/README.md` é o índice por tipo/status.
- Documentos antigos em `docs/governanca/STATUS_REAL_*` ficam como histórico, não como fonte ativa.

## Prioridades recomendadas

1. Validar em produção a nova página de Produtos e o fluxo de edição.
2. Validar RPCs de Contas a Receber em ambiente real.
3. Decidir se o módulo Acessos será concluído agora ou mantido como placeholder.
4. Aplicar e validar `sql/18_pedido_itens_normalizacao.sql` em homologação antes de ligar dual-write em produção.
5. Reduzir o peso dos docs antigos criando uma pasta ou índice de arquivo histórico.

## Critério prático de evolução

Não iniciar uma nova rodada ampla de padronização sem dor real.
A próxima melhoria deve ser escolhida por impacto no uso diário da loja.
