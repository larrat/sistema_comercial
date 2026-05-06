# Inventário de Pedidos — Fase 0

Data: 2026-05-06
Plano de referência: `docs/andamento/PLANO_OPERACIONAL_PADRONIZACAO_PEDIDOS.md`
Escopo: diagnóstico e baseline. Nenhum arquivo de produto foi alterado.

## Resumo

O módulo Pedidos está ativo em React e já usa parte do padrão de Clientes/Produtos na lista: `PageHeader`, `FilterBar`, `DataTable`, `ActionMenu`, `StatusBadge` e `Modal` de cancelamento.

A principal diferença é que Pedidos ainda mistura lista, drawer de detalhe, formulário, regras financeiras, parsing de `pedido.itens`, bridge legado e partes do PDV dentro da mesma feature `src/react/features/pedidos`.

Importante: PDV também mora dentro de `src/react/features/pedidos`, mas ficou marcado como fora do escopo das Fases 0 a 4 por regra do plano.

## Tabela de arquivos do módulo

### Pedidos — escopo direto da padronização

| Arquivo | Linhas | Papel atual | Observação |
|---|---:|---|---|
| `src/react/features/pedidos/pages/PedidosRoutePage.tsx` | 25 | Rota `/app/pedidos` | Lê query params `pedido`, `cliente`, `view`; não existe rota `/app/pedidos/:pedidoId`. |
| `src/react/features/pedidos/components/PedidosPilotPage.tsx` | 215 | Orquestra lista, drawer de detalhe e formulário | Mantém bridge com shell legado e controla estados `editingId`/`detailId`. |
| `src/react/features/pedidos/components/PedidoListView.tsx` | 475 | Lista principal de pedidos | Já usa `PageHeader`, `FilterBar`, `DataTable`; métricas e tabs ainda são locais. |
| `src/react/features/pedidos/components/PedidoDetailPanel.tsx` | 462 | Detalhe rápido em drawer | Mistura visual de detalhe, financeiro, baixa parcial, eventos legados e ações de pedido. |
| `src/react/features/pedidos/components/PedidoForm.tsx` | 493 | Criação/edição de pedido | Formulário em card próprio; ainda usa classes `modal-shell-*` e contém validações/cálculos locais. |
| `src/react/features/pedidos/components/PedidoCancelConfirmModal.tsx` | 70 | Confirma cancelamento | Usa `Modal` compartilhado. |
| `src/react/features/pedidos/components/PedidoItemAdd.tsx` | 162 | Adição de item no pedido | Calcula preço sugerido localmente. |
| `src/react/features/pedidos/components/PedidoItemsSection.tsx` | 73 | Tabela de itens | Calcula total, lucro e margem localmente. |
| `src/react/features/pedidos/components/PedidoItemRow.tsx` | 53 | Linha de item | Calcula subtotal, lucro e margem localmente. |
| `src/react/features/pedidos/components/PedidoRow.tsx` | 205 | Linha antiga/local de pedido | Parece resíduo do layout anterior; não é usado pela lista atual que usa `DataTable`. |
| `src/react/features/pedidos/hooks/usePedidoData.ts` | 134 | Carrega lista e resumo | Usa `listPedidosPage` e `listPedidosSummary`. |
| `src/react/features/pedidos/hooks/usePedidoFormData.ts` | 69 | Carrega dados auxiliares do form | Busca produtos, clientes e RCAs. |
| `src/react/features/pedidos/hooks/usePedidoMutations.ts` | 216 | Salvar, avançar, cancelar, reabrir e gerar conta | Concentra regra de status e integração com Contas a Receber. |
| `src/react/features/pedidos/services/pedidosApi.ts` | 286 | API PostgREST de pedidos | Lê/grava `pedidos`; serializa `itens` como JSON string ao salvar. |
| `src/react/features/pedidos/services/contasReceberApi.ts` | 136 | Geração de contas a receber a partir de pedido | Duplica parte do domínio financeiro dentro de Pedidos. |
| `src/react/features/pedidos/services/clientesLightApi.ts` | 83 | Clientes mínimos para pedido | Busca clientes e resolve cliente por nome/id. |
| `src/react/features/pedidos/services/produtosApi.ts` | 163 | Produtos para formulário/PDV | Busca lista completa e busca fuzzy/exata para PDV. |
| `src/react/features/pedidos/services/rcasApi.ts` | 20 | Vendedores/RCAs para pedido | Busca RCAs por filial. |
| `src/react/features/pedidos/store/usePedidoStore.ts` | 167 | Store Zustand de Pedidos | Guarda paginação, filtros, resumo, pedidos e ações in-flight. |
| `src/react/features/pedidos/types.ts` | 49 | Tipos e constantes de status | Define tabs, filtros, status e progressão operacional. |
| `src/react/features/pedidos/utils/normalizePedido.ts` | 18 | Normalização de itens | Converte `pedido.itens` de string para array. |
| `src/react/features/pedidos/services/pedidosApi.test.ts` | 115 | Testes de API | Cobre URLs de listagem/resumo. |
| `src/react/features/pedidos/store/usePedidoStore.test.ts` | 111 | Testes da store | Cobre paginação e summary. |

### Arquivos na mesma feature, mas protegidos pelo plano

| Arquivo | Linhas | Papel atual | Tratamento nesta fase |
|---|---:|---|---|
| `src/react/features/pedidos/pages/PdvRoutePage.tsx` | 5 | Rota `/app/pdv` | Fora do escopo até Fase 5. |
| `src/react/features/pedidos/components/PdvPage.tsx` | 1036 | Tela do PDV | Fora do escopo até Fase 5. |
| `src/react/features/pedidos/components/PdvClienteModal.tsx` | 86 | Modal de cliente do PDV | Fora do escopo até Fase 5. |
| `src/react/features/pedidos/components/PdvComprovanteModal.tsx` | 45 | Comprovante do PDV | Fora do escopo até Fase 5. |
| `src/react/features/pedidos/components/PdvPagamentoMistoModal.tsx` | 153 | Pagamento misto do PDV | Fora do escopo até Fase 5. |
| `src/react/features/pedidos/pdv/pdvCart.ts` | 193 | Cálculo de carrinho/itens do PDV | Fora do escopo até Fase 5. |
| `src/react/features/pedidos/pdv/pdvQueue.ts` | 50 | Persistência local/fila do PDV | Fora do escopo até Fase 5. |
| `src/react/features/pedidos/pdv/pdvCart.test.ts` | 68 | Teste de carrinho/itens do PDV | Fora do escopo até Fase 5. |
| `src/react/features/pedidos/store/usePdvStore.ts` | 123 | Store do PDV | Fora do escopo até Fase 5. |

## Duplicações e divergências com `shared/`

| Local | O que existe hoje | Referência compartilhada/próxima | Impacto |
|---|---|---|---|
| `PedidoListView.tsx` | Métricas manuais com `ped-stats-bar`/`ped-stat` | `StatCard` usado em Produtos | Divergência visual média; lista não fica irmã de Produtos. |
| `PedidoListView.tsx` | Tabs locais com classes `tabs`, `tb`, `tab-count` | Não há componente compartilhado equivalente claro | Registrar como pendência de padrão se for manter abas. |
| `PedidoListView.tsx` | `formatDate`, `fmtCurrency`, `getItemCount` locais | Não há formatter compartilhado evidente | Duplicação leve, mas repetida em outros arquivos. |
| `PedidoDetailPanel.tsx` | Layout manual com `fg`, `panel`, `modal-actions`, inline styles | Padrão de página própria Clientes/Produtos | Alta divergência visual; deve virar página na Fase 2. |
| `PedidoDetailPanel.tsx` | Baixa parcial e financeiro dentro do detalhe de pedido | `Modal`/fluxo de Contas a Receber | Risco funcional médio; toca RPC financeira e estado legado. |
| `PedidoForm.tsx` | Classes `modal-shell-head` e `modal-shell-body` | `Drawer`, `FormSection`, `FormField`, `FormActions` | Mistura padrão novo com casca antiga. |
| `PedidoItemAdd.tsx` | Campos com `fl`, `fg`, `inp`, `sel` | `FormField` | Divergência visual no bloco de itens. |
| `PedidoItemsSection.tsx` | Tabela manual `tbl`/`tw` | `DataTable`, quando couber | Visual menos padronizado; pode ficar específico por ser subformulário. |
| `PedidoRow.tsx` | Linha completa antiga com confirmação inline | `DataTable`/`ActionMenu` atual | Provável código morto ou legado interno; confirmar antes de remover em fase futura. |
| `contasReceberApi.ts` dentro de Pedidos | Geração de conta a receber própria | Service de Contas a Receber | Duplica domínio financeiro dentro do módulo Pedidos. |

## Imports de `modal-shell-*` e modais ad-hoc

| Arquivo | Ocorrência | Observação |
|---|---|---|
| `PedidoForm.tsx` | `modal-shell-head`, `modal-shell-body` | Casca visual antiga dentro de formulário novo. |
| `PedidoDetailPanel.tsx` | `modal-actions` e formulário inline de baixa parcial | Não é `modal-shell-*`, mas é fluxo ad-hoc no detalhe. |
| `PedidoRow.tsx` | Confirmação inline de cancelamento | Provável componente antigo; a lista atual usa `PedidoCancelConfirmModal`. |
| `PdvPage.tsx` | Modais do PDV e `Modal` compartilhado | Fora do escopo até Fase 5. |

## Regras de negócio dentro de componentes de tela

| Arquivo | Regra encontrada | Observação |
|---|---|---|
| `PedidoForm.tsx` | Número do próximo pedido com base nos pedidos carregados (`nextPedNum`) | Pode divergir do backend se a página não tiver todos os pedidos carregados. Há também `getNextPedidoNumber` no service. |
| `PedidoForm.tsx` | Normalização de prazo do cliente e boleto para `30d` | Regra de negócio no componente. |
| `PedidoForm.tsx` | Validação de cliente obrigatório, cliente cadastrado e itens obrigatórios | Regra de validação no componente. |
| `PedidoForm.tsx` | Total do pedido por soma dos itens | Cálculo no componente. |
| `PedidoItemAdd.tsx` | Preço sugerido por custo, markup varejo/atacado e preço fixo | Regra de precificação no componente. |
| `PedidoItemsSection.tsx` | Total e lucro total | Cálculo no componente. |
| `PedidoItemRow.tsx` | Subtotal, lucro e margem | Cálculo no componente. |
| `PedidoDetailPanel.tsx` | Parsing de itens, valores recebido/em aberto e status financeiro | Regra financeira misturada na UI. |
| `PedidoDetailPanel.tsx` | Baixa parcial/receber tudo chamando RPC de Contas a Receber | Ação financeira crítica dentro do detalhe de pedido. |
| `usePedidoMutations.ts` | Progressão de status, cancelamento, reabertura e geração de conta | Está em hook, mas concentra regra crítica. Boa candidata para service dedicado na Fase 3. |
| `contasReceberApi.ts` | Cálculo de vencimento por prazo e geração de conta | Service local do módulo Pedidos; precisa cuidado por tocar financeiro. |

## Queries, RPCs e tabelas usadas

| Origem | Operação | Tabela/RPC | Toca `pedido.itens`? | Observação |
|---|---|---|---|---|
| `pedidosApi.ts` | `GET /rest/v1/pedidos?...` | `pedidos` | Sim, por retorno da linha inteira | `listPedidos` sem `select`; normaliza itens. |
| `pedidosApi.ts` | `GET /rest/v1/pedidos?...limit/offset` | `pedidos` | Sim, por retorno da linha inteira | `listPedidosPage` sustenta a lista atual. |
| `pedidosApi.ts` | `GET /rest/v1/pedidos?select=status,total` | `pedidos` | Não | Resumo de status/valor. |
| `pedidosApi.ts` | `GET /rest/v1/pedidos?select=num&order=num.desc&limit=1` | `pedidos` | Não | Próximo número via backend, usado pelo PDV. |
| `pedidosApi.ts` | `POST /rest/v1/pedidos` | `pedidos` | Sim, grava `itens` como `JSON.stringify(input.itens)` | Ponto principal do agregado `pedido.itens`. |
| `pedidosApi.ts` | `PATCH /rest/v1/pedidos?id=...` | `pedidos` | Não | Atualiza só `status`. |
| `clientesLightApi.ts` | `GET /rest/v1/clientes?...` | `clientes` | Não | Dados mínimos para form de pedido. |
| `produtosApi.ts` | `GET /rest/v1/produtos?...` | `produtos` | Não | Lista de produtos e busca PDV. |
| `rcasApi.ts` | `GET /rest/v1/rcas?...` | `rcas` | Não | Vendedores. |
| `contasReceberApi.ts` | `POST /rest/v1/contas_receber` | `contas_receber` | Não | Geração automática/manual ao entregar pedido. |
| `PedidoDetailPanel.tsx` | `registrarBaixaRpc` | `rpc_registrar_baixa` | Não | RPC crítica importada de Contas a Receber. |
| `PedidoDetailPanel.tsx` | `listContas`, `listBaixas` | `contas_receber`, `contas_receber_baixas` | Não | Recarrega financeiro do pedido. |
| `clientes/services/pedidosApi.ts` | `GET /rest/v1/pedidos?...` | `pedidos` | Sim, por retorno da linha inteira | Perfil de Cliente lista pedidos do cliente. |
| `dashboard/services/dashboardApi.ts` | `GET /rest/v1/pedidos?...` | `pedidos` | Sim, por retorno da linha inteira | Dashboard calcula lucro/top produtos a partir dos itens. |
| `relatorios/services/relatoriosApi.ts` | `GET /rest/v1/pedidos?select=id,num,cli,total,status,rca_nome` | `pedidos` | Não | Relatórios atuais não leem itens nessa query. |

## Pontos que tocam `pedido.itens`

| Arquivo | Uso |
|---|---|
| `src/types/domain.d.ts` | Define `Pedido.itens` como `PedidoItem[] | string`. |
| `src/react/features/pedidos/utils/normalizePedido.ts` | Converte string JSON em array. |
| `src/react/features/pedidos/services/pedidosApi.ts` | Serializa `itens` como string ao salvar. |
| `src/react/features/pedidos/components/PedidoListView.tsx` | Conta itens para exibir na tabela. |
| `src/react/features/pedidos/components/PedidoDetailPanel.tsx` | Faz parse e renderiza itens. |
| `src/react/features/pedidos/components/PedidoForm.tsx` | Faz parse inicial, valida itens, calcula total e salva. |
| `src/react/features/pedidos/components/PedidoItemsSection.tsx` | Calcula total/lucro e renderiza itens. |
| `src/react/features/pedidos/components/PedidoItemRow.tsx` | Calcula subtotal/lucro/margem. |
| `src/react/features/pedidos/components/PedidoRow.tsx` | Conta itens; provável componente legado interno. |
| `src/react/features/pedidos/components/PdvPage.tsx` | Monta `itens` no fechamento de venda; fora do escopo até Fase 5. |
| `src/react/features/pedidos/pdv/pdvCart.ts` | Gera itens do pedido a partir do carrinho; fora do escopo até Fase 5. |
| `src/react/features/dashboard/components/DashboardPilotPage.tsx` | Calcula lucro e top produtos usando itens. |
| `src/react/features/clientes/services/pedidosApi.ts` | Retorna pedidos do cliente com itens agregados. |
| Legado `src/app`, `src/features`, `src/core` | Ainda faz parse/gravação de `itens` em alguns pontos. | Compatibilidade/histórico, não referência para evolução. |

## Top 5 divergências visuais em relação a Clientes/Produtos

1. Detalhe de pedido ainda abre em drawer simples, não em página própria como Clientes e Produtos.
2. Formulário de pedido aparece como card abaixo da lista, enquanto Clientes/Produtos usam drawer para criação/edição rápida e página própria para detalhe rico.
3. Métricas de topo usam `ped-stats-bar` local, não `StatCard`/grid compartilhado como Produtos.
4. Bloco de itens usa tabela manual e campos locais, visualmente diferente do padrão de formulário de Clientes/Produtos.
5. Financeiro do pedido fica dentro do detalhe com layout próprio e ações inline; Clientes separa informações por abas/cartões e Produtos usa cards/abas de detalhe mais limpos.

## Baseline de tipagem

| Comando | Resultado | Observação |
|---|---|---|
| `npm run typecheck` | 0 erros | Passou. |
| `npm run typecheck:strict` | 11 erros | Falhou fora do módulo Pedidos. Nenhum erro em `src/react/features/pedidos`. |

Erros strict por área:

| Área | Quantidade |
|---|---:|
| Clientes | 2 |
| Cotação | 1 |
| Estoque | 2 |
| Produtos | 2 |
| Relatórios | 4 |
| Pedidos | 0 |

## Pontos para o humano verificar

- O inventário cobre os arquivos de Pedidos que você reconhece no uso real?
- A separação entre Pedidos e PDV faz sentido para você, já que ambos estão na mesma pasta?
- As 5 divergências visuais batem com sua percepção da tela?
- A lista de queries/RPCs parece completa para o fluxo que você usa na loja?
- A Fase 1 deve focar só lista/métricas/filtros ou também deve preparar a navegação para a página de detalhe da Fase 2?
