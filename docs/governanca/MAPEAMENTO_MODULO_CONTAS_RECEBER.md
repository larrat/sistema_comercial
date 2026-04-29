# Mapeamento do Módulo Contas a Receber

## 1. Arquivos principais

### Entrada React do módulo
- [src/react/features/contas-receber/pages/ContasReceberRoutePage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/pages/ContasReceberRoutePage.tsx:1)
- [src/react/features/contas-receber/components/ContasReceberPilotPage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/components/ContasReceberPilotPage.tsx:1)

### Dados e mutations
- [src/react/features/contas-receber/hooks/useContasReceberData.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/hooks/useContasReceberData.ts:1)
- [src/react/features/contas-receber/hooks/useContasReceberMutations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/hooks/useContasReceberMutations.ts:1)
- [src/react/features/contas-receber/store/useContasReceberStore.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/store/useContasReceberStore.ts:1)
- [src/react/features/contas-receber/services/contasReceberApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/services/contasReceberApi.ts:1)

### Integração com Pedidos
- [src/react/features/pedidos/services/contasReceberApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/services/contasReceberApi.ts:1)
- [src/react/features/pedidos/components/PedidoDetailPanel.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/components/PedidoDetailPanel.tsx:112)
- [src/react/features/pedidos/hooks/usePedidoMutations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/hooks/usePedidoMutations.ts:120)

### Tipos de domínio / contratos
- [src/types/domain.d.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/types/domain.d.ts:185)

### Infra residual / legado
- [src/app/api.js](/Users/larrat/sistema_comercial/sistema_comercial/src/app/api.js:862)
- [src/app/store.js](/Users/larrat/sistema_comercial/sistema_comercial/src/app/store.js:19)
- [src/features/runtime-loading.js](/Users/larrat/sistema_comercial/sistema_comercial/src/features/runtime-loading.js:178)
- [src/features/navigation.js](/Users/larrat/sistema_comercial/sistema_comercial/src/features/navigation.js:474)
- [src/features/auth-setup.js](/Users/larrat/sistema_comercial/sistema_comercial/src/features/auth-setup.js:27)

## 2. Listagem de títulos

A listagem principal está toda dentro de [ContasReceberPilotPage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/components/ContasReceberPilotPage.tsx:1).

Fluxo atual:

1. [useContasReceberData.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/hooks/useContasReceberData.ts:1) carrega:
   - `contas_receber`
   - `contas_receber_baixas`
2. a store guarda:
   - `contas`
   - `baixas`
   - `activeTab`
   - `searchQuery`
   - `inFlight`
3. `ContasList` filtra os títulos e renderiza:
   - versão mobile em cards
   - versão desktop em tabela HTML

Campos exibidos na listagem desktop:
- cliente
- pedido
- total
- recebido
- em aberto
- vencimento
- última baixa
- ações

## 3. Status financeiro

O status exibido não depende só do campo bruto `status` salvo na conta.  
Ele é recalculado no front por helpers em [useContasReceberMutations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/hooks/useContasReceberMutations.ts:1).

### Helpers principais
- `getValorRecebido(cr)`
- `getValorEmAberto(cr)`
- `getStatusLabel(cr)`
- `getStatusEfetivo(cr)`

### Status visual (`getStatusLabel`)
- `Recebido`
- `Parcial`
- `Pendente`

### Status operacional (`getStatusEfetivo`)
- `recebido`
- `vencido`
- `pendente_ok`

Regras:
- se `valor_em_aberto <= 0` ou `status === 'recebido'` => `recebido`
- se não recebeu tudo e `vencimento < hoje()` => `vencido`
- caso contrário => `pendente_ok`

## 4. Vencidos

A aba `Vencidos` existe na própria tela e usa `statusEfetivo === 'vencido'`.

O vencimento é tratado como string `YYYY-MM-DD` e comparado diretamente com `hoje()` em formato ISO no helper `getStatusEfetivo(cr)`.

Ou seja:
- não há cálculo de timezone complexo
- a regra depende de comparação textual de datas ISO

## 5. Baixa

O fluxo principal de baixa está dividido em:

### Receber tudo
- ação `Receber tudo`
- chama `marcarRecebido(contaId)`
- internamente calcula `aberto = getValorEmAberto(conta)`
- registra uma baixa com o valor em aberto inteiro

### Baixa parcial
- ação `Baixa parcial`
- abre `BaixaParcialModal`
- o modal permite informar:
  - valor
  - data/hora
  - observação
- ao confirmar, chama `registrarBaixa(contaId, valor, recebidoEmIso, observacao)`

### Persistência
A baixa usa RPC:
- [registrarBaixaRpc(...)](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/services/contasReceberApi.ts:101)
- endpoint: `rpc_registrar_baixa`

## 6. Estorno

O fluxo de estorno já existe e está na listagem/histórico de baixas.

### Onde aparece
- componente `BaixaHistorico`
- botão `Estornar` por baixa

### Fluxo
1. seleciona a baixa vinculada à conta
2. pede confirmação com `window.confirm(...)`
3. chama `estornarBaixa(contaId, baixaId)`
4. mutation usa:
   - [estornarBaixaRpc(...)](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/services/contasReceberApi.ts:126)
   - endpoint: `rpc_estornar_baixa`
5. recarrega contas e baixas

## 7. Filtros

Os filtros atuais são simples.

### Tabs
- `Pendentes`
- `Vencidos`
- `Recebidos`

### Busca textual
`searchQuery` é aplicada em `ContasList` e procura em:
- `cliente`
- `pedido_num`
- `getStatusLabel(c)`

Não há hoje filtros separados por:
- faixa de vencimento
- faixa de valor
- vendedor
- cliente específico via select

## 8. Cliente

O cliente é um dos principais eixos da listagem.

Campos reais na conta:
- `cliente`
- `cliente_id`

Na listagem:
- o nome do cliente é o primeiro campo
- também aparece no título do modal de baixa
- também participa da busca

Na baixa:
- a `ContaReceberBaixa` também carrega `cliente` e `cliente_id`

## 9. Valor

Os valores principais do módulo são:
- `valor`
- `valor_recebido`
- `valor_em_aberto`

### Regras do front
- se `valor_recebido` for numérico, ele é usado
- se não for, e a conta estiver `recebido`, o front assume que o total foi recebido
- `valor_em_aberto` usa o campo persistido quando existir
- caso não exista, calcula:
  - `valor - valor_recebido`
  - nunca abaixo de `0`

Todos os valores são arredondados com `roundMoney(...)` no helper da mutation.

## 10. Vencimento

Campo real:
- `vencimento: string // YYYY-MM-DD`

Uso:
- ordenação da listagem ao carregar contas:
  - `order=vencimento.asc`
- classificação de vencido no front
- exibição direta na listagem

Origem:
- em muitos casos, o vencimento nasce no fluxo de `Pedidos`
- [pedidos/services/contasReceberApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/services/contasReceberApi.ts:1) calcula vencimento a partir do prazo:
  - `7d`
  - `15d`
  - `30d`
  - `60d`

## 11. Permissões

Não há uma camada explícita de permissão fina dentro da feature `contas-receber`.

O que existe hoje:
- necessidade de sessão válida
- necessidade de filial selecionada
- necessidade de config Supabase pronta

No legado, `receber` está listado em [src/features/auth-setup.js](/Users/larrat/sistema_comercial/sistema_comercial/src/features/auth-setup.js:27) dentro da matriz de páginas controladas por papel.

Leitura honesta:
- o módulo depende de proteção global/roteamento
- a feature em si não faz checagem de `role` local por ação

## 12. Validações

As validações visíveis no front estão concentradas em [useContasReceberMutations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/hooks/useContasReceberMutations.ts:1).

### Registrar baixa
- conta precisa existir
- valor da baixa precisa ser `> 0`
- baixa não pode ultrapassar o valor em aberto

### Marcar recebido
- conta precisa existir
- conta não pode já estar quitada

### Marcar pendente
- conta precisa existir

### Estornar baixa
- conta precisa existir
- baixa precisa existir e pertencer à conta

No modal de baixa parcial:
- o campo de valor usa `type="number"`, `step="0.01"` e `min="0.01"`
- mas a validação decisiva continua na mutation

## 13. Regras no front

Estas regras estão hoje no front:

1. cálculo de `valor recebido`
2. cálculo de `valor em aberto`
3. classificação de status efetivo
4. separação em tabs:
   - pendente ok
   - vencido
   - recebido
5. filtro textual
6. totalizadores dos cards de métricas
7. fallback do “recebido no mês”:
   - soma baixas do mês
   - complementa com contas `recebidas` no mês sem baixa registrada localmente

Também há regra de UX no front:
- desfazer recebimento pede confirmação
- estorno pede confirmação

## 14. Integração com Supabase/API

### Leitura
- `GET /rest/v1/contas_receber?filial_id=eq.<filial>&order=vencimento.asc`
- `GET /rest/v1/contas_receber_baixas?filial_id=eq.<filial>&order=recebido_em.desc`

### Escrita direta disponível no service
- `upsertConta(...)`
- `createBaixa(...)`
- `deleteBaixa(...)`
- `deleteBaixasByConta(...)`

### Escrita efetivamente usada no fluxo principal atual
- `rpc_registrar_baixa`
- `rpc_estornar_baixa`
- `rpc_marcar_conta_pendente`

### Integração com Pedidos
O módulo `Pedidos` também cria contas a receber:
- automaticamente quando um pedido vira `entregue`
- manualmente pelo detalhe do pedido

Esse fluxo usa:
- [src/react/features/pedidos/services/contasReceberApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/pedidos/services/contasReceberApi.ts:1)

E ainda atualiza cache legado:
- `D.contasReceber`
- eventos:
  - `sc:conta-receber-criada`
  - `sc:contas-receber-sync`

## 15. Ações críticas

As ações mais críticas hoje são:

1. receber tudo
2. registrar baixa parcial
3. desfazer recebimento / marcar pendente
4. estornar baixa

Motivos:
- alteram valores financeiros
- alteram status efetivo
- impactam o que aparece em aberto, vencido e recebido
- se derem errado, comprometem a leitura operacional do financeiro

Também é crítica a integração com `Pedidos`, porque novas contas podem nascer de lá.

## 16. Riscos

### 1. Regra financeira híbrida
Parte da regra está no React e parte nos RPCs.  
Se alguém alterar um lado sem alinhar o outro, os totais e status podem divergir.

### 2. Status calculado no front
`getStatusEfetivo(cr)` decide muita coisa de UX e operação.  
Mexer nisso altera:
- tabs
- vencidos
- recebidos
- métricas

### 3. Dependência de `Pedidos`
`Pedidos` ainda gera contas a receber e atualiza cache legado local.  
Qualquer mudança no contrato de conta afeta os dois módulos.

### 4. Confirmações ainda nativas
`desfazer` e `estorno` ainda usam `window.confirm(...)`.  
Isso não muda regra, mas é uma superfície frágil se a gente mexer depois.

### 5. Infra legado ainda viva
Ainda existem:
- cache em `D.contasReceber`
- cache em `D.contasReceberBaixas`
- runtime loading legado
- APIs antigas em `src/app/api.js`

Ou seja: a feature React é principal, mas ainda convive com infraestrutura antiga.

### 6. Comparação de vencimento por string ISO
Hoje o vencido depende de comparação textual `vencimento < hoje()`.  
Funciona para `YYYY-MM-DD`, mas é uma área sensível se algum formato sair desse padrão.

## 17. Recomendações para próxima etapa

Se a próxima rodada for de padronização/UX, o corte mais seguro é:

1. padronizar a listagem com `PageHeader`, `DataTable`, `FilterBar`, `StatusBadge`
2. trocar `window.confirm(...)` de estorno/desfazer por confirmação visual consistente
3. melhorar estados `loading/empty/error`

Se a próxima rodada for técnica:

1. mapear melhor a convivência com `Pedidos`
2. revisar a dependência do cache legado `D.contasReceber`
3. decidir quais regras financeiras devem permanecer no front e quais devem ficar só nos RPCs

---

Este documento registra apenas o estado real atual do módulo.  
Nenhuma regra de baixa, estorno, valor ou status foi alterada neste mapeamento.
