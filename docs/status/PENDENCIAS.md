# Pendências da Padronização de Pedidos

Arquivo mantido conforme `docs/andamento/PLANO_OPERACIONAL_PADRONIZACAO_PEDIDOS.md`.
Não é backlog geral do sistema; registra apenas itens encontrados durante as fases e deixados conscientemente fora do escopo atual.

## 2026-05-06 — Fase 0

| Pendência | Por que está fora do escopo atual |
|---|---|
| Confirmar se `src/react/features/pedidos/components/PedidoRow.tsx` ainda é usado ou se virou resíduo do layout anterior. | Fase 0 é diagnóstico; remoção de código só em fase posterior e com validação. |
| Decidir se as tabs de Pedidos devem virar componente compartilhado ou continuar locais. | Criar padrão novo é proibido nesta fase. |
| Separar mentalmente Pedidos e PDV, mesmo estando na mesma pasta `src/react/features/pedidos`. | PDV só pode ser tocado na Fase 5. |
| Extrair regras de preço, prazo, total, lucro, baixa e conta a receber para hooks/services dedicados. | Fase 0 não altera código; Fase 3 é o momento previsto para mover regras sem mudar comportamento. |
| Avaliar impacto futuro da normalização de `pedido.itens` em Dashboard, Clientes, PDV e legado. | SQL e normalização só entram na Fase 4, com validação cruzada. |

## 2026-05-06 — Fase 1

Nenhuma pendência nova foi gerada. A fase ficou limitada à lista de Pedidos, mantendo detalhe, formulário, SQL e PDV fora do escopo.

## 2026-05-06 — Fase 2

| Pendência | Por que está fora do escopo atual |
|---|---|
| Criar dados específicos de entrega/logística, caso a loja precise rastrear endereço, retirada, transportadora ou previsão. | A Fase 2 não pode inventar dado nem alterar SQL. |
| Criar histórico completo de eventos do pedido. | Não há trilha completa disponível no schema atual; SQL só entra na Fase 4. |
| Transformar edição de pedido em página/drawer padronizado. | A Fase 2 mantém o formulário antigo; formulários entram na Fase 3. |

## 2026-05-06 — Fase 3

Nenhuma pendência nova de produto foi gerada. A fase ficou limitada a formulário, modais e extração de regras locais de Pedidos, mantendo SQL e PDV fora do escopo.

## 2026-05-06 — Fase 4

| Pendência | Por que está fora do escopo atual |
|---|---|
| Aplicar `sql/18_pedido_itens_normalizacao.sql` em homologação e executar validação cruzada de 50 pedidos. | O ambiente local não tem alvo/credencial de homologação configurado; aplicar banco sem alvo explícito seria risco desnecessário. |
| Definir o momento do dual-write do PDV para gravar também em `pedido_itens`. | PDV é intocável na Fase 4; dual-write só entra na Fase 5 e com flag. |

## 2026-05-06 — Fase 5

| Pendência | Por que está fora do escopo atual |
|---|---|
| Ligar `window.__SC_PEDIDO_ITENS_DUAL_WRITE__ = true` em homologação e fechar 10+ vendas simuladas pelo PDV. | A validação exige ambiente real/homologação com banco aplicado; o ambiente local não tem alvo/credencial configurado. |
| Decidir quando habilitar dual-write em produção. | Só pode ser decidido depois da validação de homologação confirmar Receber, Estoque, comprovante e `pedido_itens`. |

## 2026-05-10 — Separação entrega/pagamento

| Pendência | Por que está fora do escopo atual |
|---|---|
| Aplicar `sql/19_entrega_pagamento_pedidos.sql` em homologação e preencher a validação cruzada de 20 pedidos. | O ambiente local não tem alvo/credencial de homologação configurado. |
| Revisar Dashboard para substituir contagens diretas de `status === 'entregue'` pelos novos status. | A especificação mandou verificar e reportar impactos indiretos, não alterar Dashboard. |
| Revisar Relatórios para substituir métricas baseadas diretamente em `status === 'entregue'`. | A especificação mandou verificar e reportar impactos indiretos, não alterar Relatórios. |
| Decidir evolução futura do PDV para gravar eventos/status novos. | Esta execução proibiu alterações no PDV. |
| Definir campo/regra para diferenciar "à vista pago no pedido" de "à vista pago na entrega". | O schema atual não expõe essa diferença de forma explícita; criar campo novo exigiria decisão de negócio. |

## 2026-05-10 — Navegação e edição de itens de Pedidos

| Pendência | Por que está fora do escopo atual |
|---|---|
| Aplicar `sql/20_pedido_itens_edicao.sql` em homologação antes de validar edição inline. | O ambiente local não tem alvo/credencial de homologação configurado; aplicar banco sem alvo explícito seria risco desnecessário. |
| Decidir se editar itens deve atualizar automaticamente contas a receber vinculadas. | A especificação proibiu alterar Receber automaticamente e pediu registrar a decisão para o humano. |
| Definir regra de estoque para item adicionado/removido em pedido já existente. | Não há RPC existente de adição de item de pedido que registre movimentação de estoque; implementar baixa/estorno automática exigiria decisão de negócio. |
| Revisar Dashboard e Relatórios para consumir `pedido_itens`/status normalizado de forma consistente. | A especificação mandou verificar impactos indiretos e reportar, não alterar esses módulos. |
| Avaliar se produto precisa de campo explícito de ativo/inativo para validar `pedido_item_adicionar`. | O schema atual de `produtos` usado pelo frontend não expõe um campo `ativo`; a RPC valida existência e filial, mas não filtra ativo. |

## 2026-05-10 — Aba Variantes de Produtos

| Pendência | Por que está fora do escopo atual |
|---|---|
| Aplicar e validar `sql/18_pedido_itens_normalizacao.sql` em homologação para alimentar os gráficos de vendas por variante. | A aba lê `pedido_itens`; sem a migration aplicada, vendas/receita ficam zeradas por fallback seguro. |
| Criar posição histórica de estoque (`estoque_posicao` ou equivalente) se a loja precisar de saldo médio/final real por período. | O schema atual não expõe tabela histórica de posição; a aba usa saldo atual ajustado por movimentações disponíveis e documenta a limitação. |
| Revisar se o filtro de vendas deve usar `pedidos.data` ou `pedido_itens.criado_em` como data oficial. | O serviço tenta juntar com `pedidos`, mas o filtro HTTP ainda é aplicado em `pedido_itens.criado_em`; mudar a data oficial exige decisão de negócio e validação de dados. |

## 2026-05-10 — Correção pedidos venda_fechada/Bruno/numeração

| Pendência | Por que está fora do escopo atual |
|---|---|
| Executar `sql/manual/2026-05-10_corrigir_pedidos_venda_fechada_bruno.sql` em homologação bloco a bloco, validando cada SELECT antes de UPDATE/INSERT. | Não há alvo/credencial de homologação configurado nesta sessão; rodar sem confirmar ambiente seria risco operacional. |
| Confirmar com Lucas Larrat se o pedido do Bruno teve 4 unidades ou 2 unidades antes de aplicar o Bloco 4. | A especificação proíbe corrigir o item duplicado sem confirmação humana do cenário correto. |
| Aplicar `sql/21_pedidos_numero_atomico.sql` em homologação depois de resolver duplicidades existentes. | A migration cria índice único apenas se não houver duplicidade; precisa da correção manual prévia. |
| Fazer baixas retroativas uma a uma via `rpc_registrar_baixa`, depois de o humano confirmar quais valores realmente entraram. | Baixa financeira não pode ser inferida em lote pelo sistema. |
