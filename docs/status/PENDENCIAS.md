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
