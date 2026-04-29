# Mapeamento do Módulo Pedidos

## 1. Arquivos principais

### Entrada React atual
- [src/react/features/pedidos/pages/PedidosRoutePage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/pages/PedidosRoutePage.tsx:1)
- [src/react/features/pedidos/components/PedidosPilotPage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidosPilotPage.tsx:1)

### Listagem
- [src/react/features/pedidos/components/PedidoListView.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoListView.tsx:1)
- [src/react/features/pedidos/components/PedidoRow.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoRow.tsx:1)
- [src/react/features/pedidos/store/usePedidoStore.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/store/usePedidoStore.ts:1)
- [src/react/features/pedidos/types.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/types.ts:1)

### Criação e edição
- [src/react/features/pedidos/components/PedidoForm.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoForm.tsx:1)
- [src/react/features/pedidos/components/PedidoItemsSection.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoItemsSection.tsx:1)
- [src/react/features/pedidos/components/PedidoItemAdd.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoItemAdd.tsx:1)
- [src/react/features/pedidos/components/PedidoItemRow.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoItemRow.tsx:1)
- [src/react/features/pedidos/hooks/usePedidoFormData.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/hooks/usePedidoFormData.ts:1)
- [src/react/features/pedidos/hooks/usePedidoMutations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/hooks/usePedidoMutations.ts:1)

### Detalhe e ações operacionais
- [src/react/features/pedidos/components/PedidoDetailPanel.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoDetailPanel.tsx:1)

### Dados / API
- [src/react/features/pedidos/hooks/usePedidoData.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/hooks/usePedidoData.ts:1)
- [src/react/features/pedidos/services/pedidosApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/services/pedidosApi.ts:1)
- [src/react/features/pedidos/services/clientesLightApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/services/clientesLightApi.ts:1)
- [src/react/features/pedidos/services/produtosApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/services/produtosApi.ts:1)
- [src/react/features/pedidos/services/rcasApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/services/rcasApi.ts:1)
- [src/react/features/pedidos/services/contasReceberApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/services/contasReceberApi.ts:1)

### Legado residual
- [src/features/pedidos.js](/Users/larrat/sistema_comercial/sistema_comercial/src/features/pedidos.js:1)
  - hoje é um stub compatível, marcado como depreciado
- [src/features/navigation.js](/Users/larrat/sistema_comercial/sistema_comercial/src/features/navigation.js:456)
  - ainda contém metadados e CTAs legados de pedidos

## 2. Fluxo de listagem

1. A rota principal entra por [PedidosRoutePage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/pages/PedidosRoutePage.tsx:1).
2. O hook [usePedidoData.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/hooks/usePedidoData.ts:1) carrega os pedidos da filial atual via Supabase REST.
3. Os dados entram na store [usePedidoStore.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/store/usePedidoStore.ts:1).
4. A página [PedidosPilotPage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidosPilotPage.tsx:1) decide se a superfície ativa é:
   - lista
   - detalhe
   - formulário
5. A listagem em si fica em [PedidoListView.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoListView.tsx:1).

### Como a listagem filtra
- A store já faz o primeiro corte por:
  - tab ativa
  - busca por número ou cliente
  - filtro de status
- Isso está em [selectPedidosForTab()](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/store/usePedidoStore.ts:28).

### Filtros locais adicionais na listagem
- filtro de pagamento
- filtro de período
- ordenação:
  - mais recentes
  - mais antigos
  - maior valor
  - menor valor
  - cliente A-Z

Esses filtros adicionais vivem localmente em [PedidoListView.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoListView.tsx:1), não na store global da feature.

### Tabs operacionais
- `emaberto`: `orcamento`, `confirmado`, `em_separacao`
- `entregues`: `entregue`
- `cancelados`: `cancelado`

Definição central em [types.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/types.ts:7).

## 3. Fluxo de criação

1. O usuário abre “Novo pedido” na [PedidoListView.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoListView.tsx:1).
2. [PedidosPilotPage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidosPilotPage.tsx:1) troca o estado local para `editingId = 'new'`.
3. O formulário [PedidoForm.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoForm.tsx:1) carrega:
   - produtos
   - clientes light
   - RCAs
4. O usuário preenche:
   - cliente
   - data
   - vendedor
   - itens
   - status
   - pagamento
   - prazo
   - tipo
   - observações
5. Ao salvar, [usePedidoMutations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/hooks/usePedidoMutations.ts:1) chama:
   - `savePedido(...)`
6. Se o status salvo for `entregue`, o fluxo tenta gerar conta a receber automaticamente.

## 4. Fluxo de edição

1. A edição pode ser aberta:
   - da lista
   - do detalhe
   - por intenção de rota (`?pedido=...&view=edit`)
2. [PedidosPilotPage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidosPilotPage.tsx:1) localiza o pedido na store.
3. [PedidoForm.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoForm.tsx:1) inicializa o estado com o pedido atual.
4. Os itens existentes são lidos de:
   - array já pronto
   - ou JSON serializado em `pedido.itens`
5. Ao salvar:
   - mantém `id`
   - mantém `num`
   - recalcula `total`
   - persiste novamente via `savePedido(...)`

## 5. Fluxo de cancelamento

### Na lista
- Cada linha usa [PedidoRow.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoRow.tsx:1).
- Há confirmação inline:
  - botão `Cancelar`
  - depois `Sim` / `Não`

### No detalhe
- O detalhe usa [PedidoDetailPanel.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoDetailPanel.tsx:1).
- Se o status não for `cancelado` nem `entregue`, aparece ação `Cancelar`.

### Regra operacional
- O cancelamento chama [cancelarPedido()](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/hooks/usePedidoMutations.ts:67).
- Essa mutation:
  - bloqueia se já estiver `cancelado`
  - bloqueia se já estiver `entregue`
  - faz `PATCH` de status para `cancelado`
  - atualiza a store local

### Reabertura
- Se estiver `cancelado`, existe ação `Reabrir`
- A reabertura volta para `orcamento`

## 6. Regras de cálculo e totais

### Total do pedido
- O total do pedido no form é calculado por:
  - `sum(item.qty * item.preco)`
- Está em [PedidoForm.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoForm.tsx:66).

### Total por item
- Cada item calcula:
  - `subtotal = qty * preco`
  - `lucro = (preco - custo) * qty`
  - `margem = ((preco - custo) / preco) * 100`
- Está em [PedidoItemRow.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoItemRow.tsx:1).

### Total e lucro no bloco de itens
- [PedidoItemsSection.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoItemsSection.tsx:1) soma:
  - total do pedido
  - lucro total

### Preço sugerido do item
- Ao adicionar produto, [PedidoItemAdd.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoItemAdd.tsx:1) calcula preço sugerido:
  - atacado: usa `pfa` ou `custo * (1 + mka/100)`
  - varejo: usa `custo * (1 + mkv/100)` ou custo puro

### Desconto
- Não existe campo explícito de desconto por item ou no pedido no fluxo React atual.
- O “desconto” hoje é implícito no preço unitário digitado manualmente.

## 7. Status do pedido

### Status suportados
- `orcamento`
- `confirmado`
- `em_separacao`
- `entregue`
- `cancelado`

### Progressão operacional
- `orcamento -> confirmado`
- `confirmado -> em_separacao`
- `em_separacao -> entregue`

Definição central em [types.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/types.ts:14).

### Normalização
- Há normalização para variantes como:
  - `orçamento`
  - `em separação`
  - `entregues`
  - `cancelados`

Função: [normalizePedStatus()](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/types.ts:28).

## 8. Validações existentes

### No formulário
Em [PedidoForm.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoForm.tsx:1):
- cliente é obrigatório
- cliente precisa existir em `clientes light`
- precisa haver ao menos 1 item

Mensagens explícitas:
- `Cliente e obrigatorio.`
- `Cliente invalido. Escolha um cliente cadastrado na lista.`
- `Adicione ao menos 1 item ao pedido.`

### Na adição de item
Em [PedidoItemAdd.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoItemAdd.tsx:1):
- exige produto selecionado

### Regras de conta a receber
Em [contasReceberApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/services/contasReceberApi.ts:1):
- prazo `imediato` não gera conta
- geração manual exige prazo entre:
  - `7d`
  - `15d`
  - `30d`
  - `60d`

### Proteções operacionais
Em [usePedidoMutations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/hooks/usePedidoMutations.ts:1):
- exige sessão válida
- exige filial selecionada
- evita double submit via `inFlight`
- não cancela pedido já `entregue`
- não reabre pedido que não esteja `cancelado`

## 9. Integração com dados/API/Supabase

### Pedidos
- leitura: `GET /rest/v1/pedidos`
- save: `POST /rest/v1/pedidos` com `Prefer: resolution=merge-duplicates`
- status: `PATCH /rest/v1/pedidos`

Tudo em [pedidosApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/services/pedidosApi.ts:1).

### Clientes para seleção
- leitura reduzida via `clientesLightApi.ts`
- campos usados:
  - `id`
  - `nome`
  - `rca_id`
  - `rca_nome`
  - `prazo`

### Produtos
- carregados por filial
- usados no seletor e no cálculo de preço/custo sugeridos

### RCAs
- carregados separadamente para o formulário

### Contas a receber
- dependem de `contasReceberApi.ts`
- geração automática ou manual depende de backend + cache local legado `D`

### Dependência híbrida
- O detalhe financeiro em [PedidoDetailPanel.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoDetailPanel.tsx:1) ainda depende de:
  - `D.contasReceber`
  - `D.contasReceberBaixas`
- Ou seja: o módulo React de pedidos ainda convive com cache legado para o financeiro.

## 10. Componentes utilizados

### Da própria feature
- `PedidosPilotPage`
- `PedidoListView`
- `PedidoRow`
- `PedidoForm`
- `PedidoItemsSection`
- `PedidoItemAdd`
- `PedidoItemRow`
- `PedidoDetailPanel`

### Globais já usados
- [EmptyState](/Users/larrat/sistema_comercial/sistema_comercial/src/react/shared/ui/EmptyState.tsx:1)
- [StatusBadge](/Users/larrat/sistema_comercial/sistema_comercial/src/react/shared/ui/StatusBadge.tsx:1)

### O que ainda não é padrão global
- listagem não usa `DataTable`
- toolbar não usa `FilterBar`
- detalhe e form não usam `Drawer`
- ações por linha não usam `ActionMenu`
- form ainda usa markup próprio, não `FormSection/FormField/FormError`

## 11. Ações críticas

- salvar pedido
- avançar status
- cancelar pedido
- reabrir pedido
- gerar conta a receber automaticamente ao entregar
- gerar conta a receber manualmente no detalhe
- registrar baixa parcial
- receber tudo no financeiro do pedido

Essas ações são críticas porque alteram:
- status operacional
- total persistido
- vínculo do pedido com cliente
- financeiro derivado

## 12. Riscos

### 1. Dependência híbrida com legado
- o financeiro do detalhe ainda lê e sincroniza `D.contasReceber` e `D.contasReceberBaixas`
- qualquer padronização visual ali precisa respeitar essa convivência

### 2. Cálculo sensível no front
- total, lucro, margem e preço sugerido já são calculados no front
- mudança visual mal feita pode mexer sem querer em cálculo

### 3. Seleção de cliente por texto
- o cliente é resolvido por nome exato normalizado ou `id`
- qualquer alteração de UX no campo pode quebrar matching

### 4. Persistência com itens serializados
- `pedido.itens` é salvo como JSON string na API
- o detalhe e a edição dependem de parsing consistente

### 5. Status acoplado a financeiro
- mudar fluxo de status impacta geração de conta a receber
- `entregue` tem efeito colateral importante

### 6. Cancelamento e reabertura
- têm regras operacionais simples hoje
- mas estão espalhadas entre lista, detalhe e mutation

### 7. Ausência de componentes globais em partes centrais
- a tela ainda tem muita UI própria
- padronizar depois vai exigir cuidado para não regressar comportamento

## 13. Recomendações para próxima etapa

1. Padronizar primeiro a superfície da listagem:
   - `PageHeader`
   - `FilterBar`
   - `DataTable`
   - `ActionMenu`

2. Só depois padronizar criação/edição:
   - `Drawer`
   - `FormSection`
   - `FormField`
   - `FormError`

3. Tratar o detalhe com cuidado extra por causa do financeiro.

4. Antes de alterar cálculo:
   - isolar explicitamente as regras em helpers
   - cobrir total, lucro, margem e progressão de status com testes

5. Não mexer em:
   - serialização de itens
   - regra de geração de conta
   - normalização de status
   sem uma rodada específica para isso.
