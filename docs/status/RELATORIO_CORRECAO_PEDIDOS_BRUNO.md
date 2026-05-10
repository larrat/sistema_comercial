# Relatório — Correção pedidos sem venda_fechada, Bruno e numeração

Última atualização: 2026-05-10

## O que foi feito localmente

- Conferido o schema local de `contas_receber` e `contas_receber_baixas`.
- Identificado que o SQL original precisava adaptação ao schema real:
  - `status` correto em `contas_receber`: `pendente`, `parcial`, `recebido`.
  - Campo de observação na tabela principal: `obs`.
  - Baixas devem usar `contas_receber_baixas`/`rpc_registrar_baixa`, não `baixado_em` na tabela principal.
  - `contas_receber` exige `pedido_num` e `cliente`.
- Criado script operacional manual adaptado: `sql/manual/2026-05-10_corrigir_pedidos_venda_fechada_bruno.sql`.
- Criada migration de correção permanente da numeração: `sql/21_pedidos_numero_atomico.sql`.
- Frontend de Pedidos passou a tentar buscar o próximo número via RPC `next_pedido_num` antes de salvar pedido novo.
- Mantido fallback legado por `MAX(num)+1` quando a RPC ainda não existir, para implantação gradual.

## O que não foi executado

- Nenhum SQL foi aplicado em homologação ou produção nesta sessão.
- Nenhum pedido real foi alterado.
- Nenhuma conta a receber real foi criada.
- O pedido do Bruno não foi corrigido porque depende de confirmação humana do cenário A ou B.
- Nenhuma baixa financeira foi feita.

## Arquivos alterados/criados

- `sql/manual/2026-05-10_corrigir_pedidos_venda_fechada_bruno.sql`
- `sql/21_pedidos_numero_atomico.sql`
- `src/react/features/pedidos/services/pedidosApi.ts`
- `src/react/features/pedidos/services/pedidosApi.test.ts`
- `src/react/features/pedidos/hooks/usePedidoMutations.ts`
- `src/react/features/pedidos/components/PedidoForm.tsx`
- `docs/status/PENDENCIAS.md`
- `docs/status/RELATORIO_CORRECAO_PEDIDOS_BRUNO.md`

## Ordem recomendada em homologação

1. Rodar Bloco 1 do script manual e confirmar se são 10 linhas.
2. Rodar Bloco 2a e confirmar se já existem contas.
3. Rodar Bloco 2b apenas se a verificação permitir.
4. Rodar Bloco 3 para marcar `venda_fechada` nos entregues.
5. Confirmar com Lucas Larrat o cenário do pedido Bruno e só então rodar o trecho A ou B do Bloco 4.
6. Rodar Bloco 5 para corrigir o pedido do Marcio e remover duplicidade.
7. Aplicar `sql/21_pedidos_numero_atomico.sql`.
8. Fazer baixas manuais individualmente via `rpc_registrar_baixa`.

## Validação pendente

- Homologação com dados reais.
- Confirmação humana do pedido do Bruno.
- Conferência manual das contas recebidas.

## Validação local

| Validação | Resultado |
|---|---|
| `npm run typecheck:strict` | Passou. |
| `npm run typecheck` | Passou. |
| `npx vitest run --config vitest.react.config.ts src/react/features/pedidos/services/pedidosApi.test.ts src/react/features/pedidos/pdv/pdvCart.test.ts` | Passou: 2 arquivos, 19 testes. |
| `npm run build:react` | Passou, com aviso já conhecido de chunk acima de 500 kB. |
