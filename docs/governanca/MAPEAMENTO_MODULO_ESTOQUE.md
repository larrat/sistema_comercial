# Mapeamento do Módulo Estoque

## 1. Arquivos principais

### Entrada React do módulo
- [src/react/features/estoque/pages/EstoqueRoutePage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/pages/EstoqueRoutePage.tsx:1)
- [src/react/features/estoque/components/EstoquePage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/components/EstoquePage.tsx:1)

### Componentes visuais principais
- [src/react/features/estoque/components/EstoquePageHeader.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/components/EstoquePageHeader.tsx:1)
- [src/react/features/estoque/components/EstoqueMetrics.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/components/EstoqueMetrics.tsx:1)
- [src/react/features/estoque/components/EstoqueFilters.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/components/EstoqueFilters.tsx:1)
- [src/react/features/estoque/components/EstoquePositionTable.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/components/EstoquePositionTable.tsx:1)
- [src/react/features/estoque/components/EstoqueHistoryTable.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/components/EstoqueHistoryTable.tsx:1)
- [src/react/features/estoque/components/EstoqueMovementModal.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/components/EstoqueMovementModal.tsx:1)
- [src/react/features/estoque/components/EstoqueDeleteConfirmModal.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/components/EstoqueDeleteConfirmModal.tsx:1)

### Hooks e store
- [src/react/features/estoque/hooks/useEstoqueData.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/hooks/useEstoqueData.ts:1)
- [src/react/features/estoque/hooks/useEstoqueFilters.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/hooks/useEstoqueFilters.ts:1)
- [src/react/features/estoque/hooks/useEstoqueCalculations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/hooks/useEstoqueCalculations.ts:1)
- [src/react/features/estoque/hooks/useEstoqueMutations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/hooks/useEstoqueMutations.ts:1)
- [src/react/features/estoque/store/useEstoqueStore.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/store/useEstoqueStore.ts:1)
- [src/react/features/estoque/types.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/types.ts:1)

### Services e contratos de dados
- [src/react/features/estoque/services/estoqueApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/services/estoqueApi.ts:1)
- [src/react/features/produtos/services/produtosApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/produtos/services/produtosApi.ts:1)
- [src/core/validators/index.js](/Users/larrat/sistema_comercial/sistema_comercial/src/core/validators/index.js:186)

### Integração residual com outros módulos / legado
- [src/react/features/produtos/components/ProdutosPilotPage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/produtos/components/ProdutosPilotPage.tsx:120)
- [src/react/app/legacy/events.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/app/legacy/events.ts:1)
- [src/app/api.js](/Users/larrat/sistema_comercial/sistema_comercial/src/app/api.js:929)
- [src/features/runtime-loading.js](/Users/larrat/sistema_comercial/sistema_comercial/src/features/runtime-loading.js:174)

## 2. Visão de saldo

A visão de saldo atual é a aba `Posição`, controlada por `view === 'posicao'` em [EstoquePage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/components/EstoquePage.tsx:1).

O pipeline é:

1. [useEstoqueData.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/hooks/useEstoqueData.ts:1) carrega:
   - produtos da filial
   - movimentações da filial
2. [buildEstoquePositionRows(...)](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/hooks/useEstoqueCalculations.ts:100) transforma isso em linhas de posição
3. [EstoquePositionTable.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/components/EstoquePositionTable.tsx:1) exibe:
   - produto
   - SKU
   - saldo
   - mínimo
   - custo médio
   - valor em estoque
   - status
   - ação `Movimentar`

O status visual da posição hoje é derivado assim:
- `zerado`: `saldo <= 0`
- `baixo`: `minimo > 0 && saldo < minimo`
- `ok`: restante

## 3. Histórico de movimentação

A visão de histórico atual é a aba `Histórico`, controlada por `view === 'historico'`.

Fluxo:

1. [buildEstoqueHistoryRows(...)](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/hooks/useEstoqueCalculations.ts:137) ordena movimentações por `ts desc`
2. cada linha vira um `EstoqueHistoryRow` com:
   - produto
   - data formatada
   - tipo
   - quantidade formatada
   - custo formatado
   - observação
3. [EstoqueHistoryTable.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/components/EstoqueHistoryTable.tsx:1) exibe isso em `DataTable`

Tipos suportados no histórico:
- `entrada`
- `saida`
- `ajuste`
- `transf`

Se o produto não for mais encontrado no snapshot atual, a linha aparece como `Produto removido`.

## 4. Filtros existentes

Os filtros ficam em [EstoqueFilters.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/components/EstoqueFilters.tsx:1) e são aplicados via [useEstoqueFilters.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/hooks/useEstoqueFilters.ts:1).

### Posição
- busca por nome ou SKU
- filtro por status:
  - `ok`
  - `baixo`
  - `zerado`

### Histórico
- busca textual em:
  - nome do produto
  - observação
  - data formatada
- filtro por tipo:
  - `entrada`
  - `saida`
  - `ajuste`
  - `transf`

## 5. Ajuste manual

O ajuste manual existe no modal de movimentação, quando `draft.tipo === 'ajuste'`, em [EstoqueMovementModal.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/components/EstoqueMovementModal.tsx:1).

Comportamento atual:
- o usuário informa `saldo real`
- não informa `qty`
- o preview mostra o saldo final e a diferença em relação ao saldo atual

Validação:
- [validateMovimentacao(...)](/Users/larrat/sistema_comercial/sistema_comercial/src/core/validators/index.js:192) exige saldo real:
  - numérico
  - maior ou igual a zero

Regra aplicada no cálculo:
- `tipo === 'ajuste'` redefine o saldo para `saldo_real`

## 6. Entrada e saída

### Entrada
UI:
- tipo `entrada` no modal
- informa quantidade
- informa custo unitário

Persistência:
- [saveMovement(...)](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/hooks/useEstoqueMutations.ts:17) monta `MovimentoEstoque`
- chama [insertMovimentacao(...)](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/services/estoqueApi.ts:55)

Efeito no saldo:
- soma quantidade ao saldo
- recalcula custo médio ponderado

### Saída
UI:
- tipo `saida`
- informa quantidade
- custo fica apenas informativo no preview

Persistência:
- também usa `insertMovimentacao`

Efeito no saldo:
- subtrai quantidade do saldo

Proteção atual:
- se quantidade > saldo atual, abre `window.confirm(...)`
- o usuário ainda pode prosseguir

## 7. Integração com produtos

O módulo depende fortemente de `Produtos`.

Pontos principais:
- [useEstoqueData.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/hooks/useEstoqueData.ts:1) carrega `produtos` como base da posição
- [EstoqueMovementModal.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/components/EstoqueMovementModal.tsx:1) usa a lista de produtos do snapshot para selecionar o item da movimentação
- [ProdutosPilotPage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/produtos/components/ProdutosPilotPage.tsx:120) ainda abre movimentação por evento legado:
  - `sc:abrir-mov-produto`
- [EstoqueRoutePage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/pages/EstoqueRoutePage.tsx:1) escuta esse evento e abre o modal

Ou seja: `Produtos -> Estoque` ainda está operacionalmente acoplado por evento global.

## 8. Regras de saldo

As regras reais de saldo estão em [calculateEstoqueSaldos(...)](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/hooks/useEstoqueCalculations.ts:54).

Fluxo:

1. inicializa um mapa por produto com:
   - `saldo = produto.esal`
   - `cm = produto.ecm || produto.custo`
2. ordena movimentações por `ts asc`
3. aplica cada movimento em sequência

Regras:

### Entrada
- `saldo += qty`
- `cm` é recalculado por média ponderada

### Saída
- `saldo -= qty`

### Transferência (`transf`)
- na filial de origem, é tratada como saída:
  - `saldo -= qty`

### Ajuste
- `saldo = saldo_real`

Observação importante:
- o saldo atual é derivado do catálogo + histórico de movimentos
- ele não vem pronto da tabela de movimentos; ele é recomputado no front

## 9. Estoque negativo

O módulo atual **permite** saldo negativo de forma operacional.

Isso aparece em dois pontos:

1. na mutation:
   - [useEstoqueMutations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/hooks/useEstoqueMutations.ts:31)
   - `saida` e `transf` acima do saldo apenas pedem confirmação
2. no cálculo:
   - `saldo <= 0` já cai em status `zerado`
   - não há bloqueio para saldo negativo

Conclusão:
- estoque negativo não é impedido
- ele é permitido com confirmação no fluxo de saída/transferência

## 10. Filial

Sim, o módulo é multi-filial.

Pontos reais:
- [useFilialStore](/Users/larrat/sistema_comercial/sistema_comercial/src/react/app/useFilialStore.ts:1) fornece `filialId`
- [useFilialContext](/Users/larrat/sistema_comercial/sistema_comercial/src/react/app/filial/FilialProvider.tsx:1) é usado no cabeçalho da página
- todas as consultas de `movimentacoes` filtram por `filial_id`
- produtos também são carregados por filial

Transferência entre filiais:
- `transf` grava:
  - uma movimentação de transferência na origem
  - uma entrada na filial destino
- [listTransferFiliais(...)](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/services/estoqueApi.ts:91) lê:
  - `user_filiais`
  - `filiais`

Importante:
- a posição da filial atual é recarregada após transferir
- a filial destino só refletirá a mudança quando for carregada lá

## 11. Permissões

Não há uma camada explícita de permissões finas dentro da feature `Estoque`.

O que existe hoje:
- dependência de sessão válida
- dependência de `filialId`
- dependência de configuração Supabase pronta

Mensagens de bloqueio:
- sem filial: erro ao carregar ou salvar
- sem sessão/config: erro ao carregar ou salvar

No entanto:
- não há checagem local visível de papel (`role`) específica do módulo
- o controle de acesso parece depender mais do shell/roteamento/global do que da feature em si

## 12. Ações críticas

As ações mais críticas do módulo hoje são:

1. registrar `entrada`
2. registrar `saida`
3. registrar `ajuste`
4. registrar `transferência`
5. excluir movimentação

Motivos:
- todas alteram saldo derivado
- transferência impacta mais de uma filial
- exclusão recalcula retroativamente a posição

Em especial:
- transferência é o fluxo mais sensível
- exclusão é destrutiva
- saída acima do saldo pode levar a estoque negativo

## 13. Componentes usados

### Shared UI
- `PageHeader`
- `StatCard`
- `FilterBar`
- `DataTable`
- `StatusBadge`
- `EmptyState`
- `FormSection`
- `Modal`

### Infra / contexto
- `useAuthStore`
- `useFilialStore`
- `useFilialContext`
- `getSupabaseConfig`
- `emitToast`
- `subscribeLegacyEvent`

## 14. Riscos de alteração

### 1. Cálculo de saldo no front
O saldo é recomputado em [useEstoqueCalculations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/estoque/hooks/useEstoqueCalculations.ts:1).  
Qualquer alteração ali pode quebrar:
- posição
- métricas
- preview
- histórico derivado

### 2. Custo médio ponderado
A regra de custo médio da entrada está no cálculo front.  
Mexer nisso altera:
- valor em estoque
- preview de entrada
- custo usado em transferência

### 3. Estoque negativo permitido
Hoje a regra é permissiva com confirmação.  
Mudar isso afetaria o comportamento operacional já aceito pelo sistema.

### 4. Transferência multi-filial
`transferMovimentacao(...)` faz gravação em duas filiais sem transação real de banco.

Há compensação:
- grava destino primeiro
- se origem falhar, tenta apagar destino

Mesmo assim, esse é o ponto mais delicado do módulo.

### 5. Exclusão recalcula tudo
A exclusão depende de `requestReload()` e recálculo completo.  
Se alguém tentar otimizar isso localmente sem cuidado, pode gerar divergência de posição.

### 6. Dependência operacional de Produtos
`Produtos` ainda abre movimentação por `sc:abrir-mov-produto`.  
Qualquer alteração nessa ponte pode quebrar o fluxo cruzado sem parecer problema do estoque à primeira vista.

### 7. Resíduo legacy / convivência
Ainda existem:
- contrato antigo em [src/app/api.js](/Users/larrat/sistema_comercial/sistema_comercial/src/app/api.js:929)
- cache legado em [src/features/runtime-loading.js](/Users/larrat/sistema_comercial/sistema_comercial/src/features/runtime-loading.js:174)
- metadados/navegação antiga em [src/features/navigation.js](/Users/larrat/sistema_comercial/sistema_comercial/src/features/navigation.js:494)

Ou seja: a feature React é principal, mas ainda convive com infraestrutura antiga.

## 15. Recomendações para próxima etapa

Se a próxima rodada for de padronização ou UX, o corte mais seguro é:

1. mapear melhor permissões explícitas do módulo
2. revisar o fluxo `Produtos -> Estoque` para reduzir dependência do evento legado
3. só depois considerar polimento visual do modal de movimentação

Se a próxima rodada for técnica/operacional, o foco mais sensato é:

1. documentar formalmente a política atual de estoque negativo
2. revisar a trilha de auditoria da transferência entre filiais
3. decidir quando a ponte `sc:abrir-mov-produto` poderá ser desligada

---

Este documento reflete apenas o estado real atual do módulo.  
Nenhuma regra de saldo, movimentação, estoque ou persistência foi alterada neste mapeamento.
