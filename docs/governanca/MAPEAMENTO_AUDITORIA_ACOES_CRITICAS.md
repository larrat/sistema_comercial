# Mapeamento de Auditoria de Ações Críticas

Objetivo: localizar os fluxos atuais de ações críticas, o nível de risco de cada uma e o que uma trilha de auditoria futura precisará registrar.

Escopo desta rodada:
- apenas mapeamento;
- sem criar tabela;
- sem criar migration;
- sem alterar código funcional.

## Tabela de mapeamento

| Ação | Módulo | Entidade | Arquivo/fluxo atual | Dados antes | Dados depois | Permissão necessária | Motivo obrigatório? | Criticidade | Recomendação |
|---|---|---|---|---|---|---|---|---|---|
| Criar pedido | Pedidos | `pedidos` | `src/react/features/pedidos/components/PedidoForm.tsx` -> `src/react/features/pedidos/hooks/usePedidoMutations.ts` -> `src/react/features/pedidos/services/pedidosApi.ts` (`submitPedido`/`savePedido`) | inexistente; draft com cliente, itens, status, prazo e total calculado no front | novo registro de pedido; se `status = entregue`, pode gerar conta em `contas_receber` | visibilidade operacional geral; sem guard fino explícito no fluxo React atual | Não | Alta | Auditar `pedido_id`, `num`, `cliente_id`, `status`, `prazo`, `item_count`, `origin`, `user_id`, `filial_id`; registrar também se houve geração financeira automática bem-sucedida ou parcial |
| Editar pedido | Pedidos | `pedidos` | `src/react/features/pedidos/components/PedidoForm.tsx` -> `src/react/features/pedidos/hooks/usePedidoMutations.ts` -> `src/react/features/pedidos/services/pedidosApi.ts` | snapshot atual do pedido persistido; `statusAnterior` é lido antes do save | pedido atualizado; pode manter ou alterar itens, cliente, prazo e status permitido pelo formulário | visibilidade operacional geral; sem guard fino explícito no fluxo React atual | Não | Alta | Auditar diff resumido: campos alterados, `item_count` antes/depois, `status` antes/depois, `total` antes/depois apenas como número técnico interno se política permitir; se não, ao menos marcar “totais afetados = sim” |
| Cancelar pedido | Pedidos | `pedidos` | listagem/detalhe -> `src/react/features/pedidos/hooks/usePedidoMutations.ts` (`cancelarPedido`) | pedido com `status` diferente de `cancelado`/`entregue` | `status = cancelado` | pela matriz RBAC: remover pedido é `admin`/`gerente`; no fluxo React atual a ação existe na UI operacional, sem guard dedicado por papel no hook | Não | Alta | Auditar `pedido_id`, `status_anterior`, `status_novo`, `origin` (lista ou detalhe), `user_id`, `filial_id`; considerar motivo obrigatório em etapa futura |
| Baixar título financeiro | Contas a Receber | `contas_receber` + `contas_receber_baixas` | `src/react/features/contas-receber/hooks/useContasReceberMutations.ts` (`registrarBaixa`/`marcarRecebido`) -> `src/react/features/contas-receber/services/contasReceberApi.ts` -> RPC `rpc_registrar_baixa` | conta com valor em aberto e baixas anteriores; valor aberto é recalculado no front | nova baixa registrada; conta pode virar parcial ou recebida | visibilidade operacional geral; sem guard fino explícito no hook | Não | Muito alta | Auditar `conta_id`, `baixa_id`, `valor_baixa`, `valor_em_aberto_antes`, `valor_em_aberto_depois`, `recebido_em`, `user_id`, `filial_id`; forte candidato a exigir motivo quando baixa manual divergir do padrão |
| Estornar título financeiro | Contas a Receber | `contas_receber_baixas` + reflexo em `contas_receber` | `src/react/features/contas-receber/hooks/useContasReceberMutations.ts` (`estornarBaixa`/`marcarPendente`) -> `src/react/features/contas-receber/services/contasReceberApi.ts` -> RPC `rpc_estornar_baixa` / `rpc_marcar_conta_pendente` | conta recebida/parcial; baixa existente vinculada à conta | baixa removida/estornada; conta volta a parcial ou pendente | visibilidade operacional geral; sem guard fino explícito no hook | Não | Muito alta | Auditar `conta_id`, `baixa_id`, `status_antes`, `status_depois`, `valor_recebido_antes/depois`, `origin`, `user_id`, `filial_id`; recomendar motivo obrigatório no endurecimento |
| Alterar estoque | Estoque | `movimentacoes` | `src/react/features/estoque/components/EstoqueMovementModal.tsx` -> `src/react/features/estoque/hooks/useEstoqueMutations.ts` (`saveMovement`) -> `src/react/features/estoque/services/estoqueApi.ts` (`insertMovimentacao` / `transferMovimentacao`) | saldo atual e custo médio atuais, derivados de `produtos + movimentacoes` | nova movimentação de `entrada`, `saida` ou `transf`; posição é recalculada depois | pela matriz RBAC: excluir movimentação é `admin`/`gerente`; criar movimentação não está explicitamente restrito na matriz atual | Não | Muito alta | Auditar `movimento_id`, `produto_id`, `tipo`, `qty`, `custo`, `saldo_antes`, `saldo_depois`, `filial_origem`, `filial_destino` se houver; registrar confirmação de estoque negativo quando ocorrer |
| Ajustar estoque manualmente | Estoque | `movimentacoes` | `src/react/features/estoque/components/EstoqueMovementModal.tsx` + `src/react/features/estoque/components/EstoqueAdjustConfirmModal.tsx` -> `src/react/features/estoque/hooks/useEstoqueMutations.ts` (`saveMovement` com `tipo = ajuste`) | saldo atual do produto e `saldo_real` informado no draft | grava movimento `ajuste`; saldo passa a refletir `saldo_real` | mesma superfície operacional do estoque; sem guard fino explícito no hook | Não hoje | Muito alta | Tratar como ação distinta da movimentação comum; auditar `saldo_antes`, `saldo_real_informado`, `delta`, `obs`, `produto_id`, `user_id`, `filial_id`; forte recomendação de motivo obrigatório |
| Alterar preço | Produtos / Cotação | `produtos` e/ou `cotacao_precos` | 1) `src/react/features/produtos/components/ProdutoForm.tsx` -> `src/react/features/produtos/hooks/useProdutoMutations.ts` (`submitProduto`/`saveProduto`) 2) `src/react/features/cotacao/hooks/useCotacaoMutations.ts` (`atualizarPreco`) | preço/custo/markup atuais do produto ou preço atual da cotação por fornecedor | produto salvo com nova precificação ou preço de cotação alterado/removido | produto: visibilidade operacional geral; cotação: respeita lock da cotação, mas sem guard por papel no hook | Não | Alta | Separar auditoria em duas categorias: `produto_preco_alterado` e `cotacao_preco_alterado`; registrar campo alterado, valor antes/depois, produto, fornecedor quando aplicável, lock state, `user_id`, `filial_id` |
| Alterar permissão | Acessos | `user_perfis` | fluxo legado em `src/features/filiais-acessos.js` (`salvarPerfilAcesso`) -> `SB.upsertUserPerfilEdge(...)` | perfil atual do usuário ou ausência de perfil | papel salvo/atualizado (`admin`, `gerente`, `operador`) | `admin` obrigatório por `requireRoleSafe(roleAdminOnlySafe, ...)` e pela matriz RBAC | Não hoje | Muito alta | Auditar `target_user_id`, `papel_antes`, `papel_depois`, `resolved_user_email` mascarado ou hash, `executor_user_id`, `origin`; forte candidato a motivo opcional em mudanças de privilégio alto |
| Desativar cadastro | Clientes | `clientes` | `src/react/features/clientes/components/ClienteForm.tsx` (`status = ativo/inativo`) -> `src/react/features/clientes/hooks/useClienteMutations.ts` -> `src/react/features/clientes/services/clientesApi.ts` | cliente com `status = ativo` ou `inativo` | cliente salvo com status alterado, sem exclusão física | visibilidade operacional geral; sem guard fino explícito no fluxo React atual | Não | Média/Alta | Auditar `cliente_id`, `status_antes`, `status_depois`, `origin`, `user_id`, `filial_id`; se virar bloqueio operacional relevante, promover para motivo obrigatório |
| Excluir registro sensível | Clientes / Produtos / Filiais / Acessos / Estoque | `clientes`, `produtos`, `filiais`, `user_perfis`, `movimentacoes` | principais fluxos atuais: `deleteClienteById` em `src/react/features/clientes/hooks/useClienteMutations.ts`; `deleteProdutoById` em `src/react/features/produtos/hooks/useProdutoMutations.ts`; `remover` em `src/react/features/filiais/hooks/useFilialMutations.ts`; `removerPerfilAcesso` em `src/features/filiais-acessos.js`; `deleteMovement` em `src/react/features/estoque/hooks/useEstoqueMutations.ts` | registro existente e seus vínculos operacionais | remoção física, ou remoção de perfil/vínculo crítico, com reflexo em listas e recálculos | pela matriz RBAC: remover produto/cliente/pedido/excluir movimentação = `admin`/`gerente`; remover filial/perfil = `admin` | Não hoje | Muito alta | Consolidar política única de auditoria destrutiva: capturar entidade, id, resumo antes da remoção, executor, filial, impacto conhecido e motivo; este é o melhor ponto para introduzir motivo obrigatório |

## Observações de risco por ação

### 1. Criar e editar pedido
- O fluxo já pode encadear efeito financeiro quando o pedido fica `entregue`.
- A auditoria futura precisa separar:
  - gravação do pedido;
  - efeito financeiro derivado;
  - falha parcial entre os dois.

### 2. Baixa e estorno financeiro
- São as ações mais sensíveis do ponto de vista financeiro.
- Hoje o backend final está em RPC, o que é bom para consistência, mas a trilha de auditoria ainda não está explicitada no front.

### 3. Estoque
- `transf` impacta duas filiais.
- `ajuste` redefine saldo, então merece trilha mais forte do que entrada/saída simples.
- exclusão de movimentação também é crítica porque recalcula posição histórica.

### 4. Permissões
- O fluxo operacional principal ainda está no módulo legado `filiais-acessos.js`.
- Como essa ação altera escopo de acesso humano, ela deve entrar na primeira leva de auditoria robusta.

### 5. Exclusões sensíveis
- Há comportamentos destrutivos espalhados por módulos diferentes.
- Mesmo antes de uma tabela formal, o sistema já pede pelo menos:
  - categoria da ação;
  - entidade;
  - executor;
  - resumo antes/depois;
  - motivo;
  - resultado.

## Recomendações para a próxima etapa

1. Definir um contrato único de evento de auditoria crítica:
   - `action`
   - `module`
   - `entity`
   - `entity_id`
   - `before`
   - `after`
   - `executor_user_id`
   - `filial_id`
   - `reason`
   - `result`
   - `timestamp`

2. Priorizar a primeira fase de auditoria em:
   - baixa financeira;
   - estorno financeiro;
   - ajuste manual de estoque;
   - cancelamento de pedido;
   - alteração de permissão.

3. Introduzir motivo obrigatório primeiro para:
   - estorno;
   - ajuste manual;
   - alteração de permissão;
   - exclusão sensível.

4. Quando a implementação começar, não depender apenas do front:
   - parte da trilha pode nascer no React;
   - mas ações financeiras e de acesso idealmente também precisam de persistência confiável no backend.
