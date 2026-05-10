-- 2026-05-10_corrigir_pedidos_venda_fechada_bruno.sql
-- Rodar SEMPRE em homologacao primeiro.
-- NAO rodar o arquivo inteiro de uma vez.
-- Executar na ordem: Bloco 1 -> 2 -> 3 -> 4 -> 5 -> 6.
-- Adaptado ao schema real do projeto:
--   contas_receber.status: pendente | parcial | recebido
--   contas_receber.obs, nao observacao
--   baixas ficam em contas_receber_baixas via rpc_registrar_baixa, nao em baixado_em na tabela principal

-- =========================================================
-- Bloco 1 — Confirmar escopo do problema (somente leitura)
-- =========================================================

SELECT
  id,
  num,
  cli,
  data,
  status,
  pgto,
  prazo,
  total,
  venda_fechada,
  criado_em
FROM pedidos
WHERE filial_id = '1775090288241-wvcx73'
  AND venda_fechada = false
  AND status != 'cancelado'
ORDER BY criado_em;

-- Esperado: 10 linhas. Se vier diferente, PARAR.

SELECT
  id,
  num,
  cli,
  status,
  pgto,
  prazo,
  total,
  itens,
  venda_fechada,
  entregue_em
FROM pedidos
WHERE id = 'd5c972b5-2167-4ef9-bf8d-ac293f745e3c';

-- =========================================================
-- Bloco 2a — Verificar Receber existente (somente leitura)
-- =========================================================

SELECT
  cr.pedido_id,
  cr.pedido_num,
  cr.cliente,
  cr.valor,
  cr.valor_recebido,
  cr.valor_em_aberto,
  cr.status,
  cr.vencimento,
  cr.obs
FROM contas_receber cr
WHERE cr.pedido_id IN (
  SELECT id FROM pedidos
  WHERE filial_id = '1775090288241-wvcx73'
    AND venda_fechada = false
    AND status != 'cancelado'
)
ORDER BY cr.pedido_id;

-- Se retornar linhas, revisar antes do INSERT.

-- =========================================================
-- Bloco 2b — Criar contas a receber retroativas
-- =========================================================
-- Rodar apenas se o Bloco 2a confirmar que nao ha contas existentes
-- ou se a condicao NOT IN abaixo for suficiente para excluir as existentes.

INSERT INTO contas_receber (
  id,
  filial_id,
  pedido_id,
  pedido_num,
  cliente_id,
  cliente,
  valor,
  valor_recebido,
  valor_em_aberto,
  vencimento,
  status,
  recebido_em,
  ultimo_recebimento_em,
  obs,
  criado_em
)
SELECT
  gen_random_uuid()::text,
  p.filial_id,
  p.id,
  p.num,
  p.cliente_id,
  p.cli,
  p.total,
  0,
  p.total,
  CASE
    WHEN p.prazo = 'imediato' OR p.pgto = 'a_vista'
      THEN p.data::date
    WHEN p.prazo = '30d'
      THEN p.data::date + INTERVAL '30 days'
    ELSE
      p.data::date + INTERVAL '30 days'
  END AS vencimento,
  'pendente',
  NULL,
  NULL,
  'Conta gerada retroativamente - correcao 2026-05-10. Verificar se ja foi recebido.',
  NOW()
FROM pedidos p
WHERE p.filial_id = '1775090288241-wvcx73'
  AND p.venda_fechada = false
  AND p.status != 'cancelado'
  AND p.id NOT IN (
    SELECT pedido_id FROM contas_receber WHERE pedido_id IS NOT NULL
  );

-- Verificar apos o INSERT.
SELECT
  p.num,
  p.cli,
  p.total,
  p.pgto,
  p.prazo,
  cr.valor,
  cr.valor_em_aberto,
  cr.vencimento,
  cr.status,
  cr.obs
FROM contas_receber cr
JOIN pedidos p ON p.id = cr.pedido_id
WHERE cr.obs ILIKE '%correcao 2026-05-10%'
ORDER BY p.num;

-- =========================================================
-- Bloco 3 — Marcar venda_fechada = true nos entregues
-- =========================================================
-- O pedido #6 Arthur Silva em_separacao NAO entra aqui.

-- Verificacao antes.
SELECT id, num, cli, status, venda_fechada
FROM pedidos
WHERE filial_id = '1775090288241-wvcx73'
  AND status = 'entregue'
  AND venda_fechada = false;

-- Correcao.
UPDATE pedidos
SET
  venda_fechada = true,
  venda_fechada_em = NOW(),
  venda_fechada_por = NULL
WHERE filial_id = '1775090288241-wvcx73'
  AND status = 'entregue'
  AND venda_fechada = false;

-- Verificacao apos.
SELECT num, cli, status, venda_fechada, venda_fechada_em
FROM pedidos
WHERE filial_id = '1775090288241-wvcx73'
  AND status = 'entregue'
ORDER BY num;

-- =========================================================
-- Bloco 4 — Pedido do Bruno: item duplicado
-- =========================================================
-- NAO rodar sem confirmar com Lucas Larrat:
-- Cenário A: foram 4 unidades; pedido correto, custo errado.
-- Cenário B: foram 2 unidades; duplicado por engano.

-- Verificacao antes.
SELECT id, num, cli, total, itens
FROM pedidos
WHERE id = 'd5c972b5-2167-4ef9-bf8d-ac293f745e3c';

-- Cenario A — 4 unidades, unificar item e manter total 399.60.
-- Tambem sincroniza pedido_itens se a tabela normalizada existir.
/*
UPDATE pedidos
SET itens = '[{"prodId":"1776178508798-xmrkda","nome":"CAMISA PRIMEIRA LINHA NACIONAL - BRASIL","un":"un","qty":4,"preco":99.9,"custo":70,"custo_base":50,"preco_base":99.9,"orig":"estoque"}]'
WHERE id = 'd5c972b5-2167-4ef9-bf8d-ac293f745e3c';

DO $$
BEGIN
  IF to_regclass('public.pedido_itens') IS NOT NULL THEN
    DELETE FROM public.pedido_itens WHERE pedido_id = 'd5c972b5-2167-4ef9-bf8d-ac293f745e3c';
    INSERT INTO public.pedido_itens (
      id, filial_id, pedido_id, produto_id, linha, nome, un, qty, preco, custo, custo_base, preco_base, orig, item
    ) VALUES (
      'd5c972b5-2167-4ef9-bf8d-ac293f745e3c:1',
      '1775090288241-wvcx73',
      'd5c972b5-2167-4ef9-bf8d-ac293f745e3c',
      '1776178508798-xmrkda',
      1,
      'CAMISA PRIMEIRA LINHA NACIONAL - BRASIL',
      'un',
      4,
      99.9,
      70,
      50,
      99.9,
      'estoque',
      '{"prodId":"1776178508798-xmrkda","nome":"CAMISA PRIMEIRA LINHA NACIONAL - BRASIL","un":"un","qty":4,"preco":99.9,"custo":70,"custo_base":50,"preco_base":99.9,"orig":"estoque"}'::jsonb
    );
  END IF;
END $$;
*/

-- Cenario B — 2 unidades, total 199.80 e Receber ajustado.
-- Tambem sincroniza pedido_itens se a tabela normalizada existir.
/*
UPDATE pedidos
SET
  itens = '[{"prodId":"1776178508798-xmrkda","nome":"CAMISA PRIMEIRA LINHA NACIONAL - BRASIL","un":"un","qty":2,"preco":99.9,"custo":70,"custo_base":50,"preco_base":99.9,"orig":"estoque"}]',
  total = 199.80
WHERE id = 'd5c972b5-2167-4ef9-bf8d-ac293f745e3c';

UPDATE contas_receber
SET
  valor = 199.80,
  valor_em_aberto = greatest(199.80 - coalesce(valor_recebido, 0), 0)
WHERE pedido_id = 'd5c972b5-2167-4ef9-bf8d-ac293f745e3c';

DO $$
DECLARE
  v_conta_id text;
BEGIN
  SELECT id INTO v_conta_id
  FROM public.contas_receber
  WHERE pedido_id = 'd5c972b5-2167-4ef9-bf8d-ac293f745e3c'
  LIMIT 1;

  IF v_conta_id IS NOT NULL THEN
    PERFORM public.refresh_conta_receber_saldo(v_conta_id);
  END IF;

  IF to_regclass('public.pedido_itens') IS NOT NULL THEN
    DELETE FROM public.pedido_itens WHERE pedido_id = 'd5c972b5-2167-4ef9-bf8d-ac293f745e3c';
    INSERT INTO public.pedido_itens (
      id, filial_id, pedido_id, produto_id, linha, nome, un, qty, preco, custo, custo_base, preco_base, orig, item
    ) VALUES (
      'd5c972b5-2167-4ef9-bf8d-ac293f745e3c:1',
      '1775090288241-wvcx73',
      'd5c972b5-2167-4ef9-bf8d-ac293f745e3c',
      '1776178508798-xmrkda',
      1,
      'CAMISA PRIMEIRA LINHA NACIONAL - BRASIL',
      'un',
      2,
      99.9,
      70,
      50,
      99.9,
      'estoque',
      '{"prodId":"1776178508798-xmrkda","nome":"CAMISA PRIMEIRA LINHA NACIONAL - BRASIL","un":"un","qty":2,"preco":99.9,"custo":70,"custo_base":50,"preco_base":99.9,"orig":"estoque"}'::jsonb
    );
  END IF;
END $$;
*/

-- Verificacao apos cenario escolhido.
SELECT id, num, cli, total, itens
FROM pedidos
WHERE id = 'd5c972b5-2167-4ef9-bf8d-ac293f745e3c';

SELECT pedido_id, valor, valor_recebido, valor_em_aberto, status
FROM contas_receber
WHERE pedido_id = 'd5c972b5-2167-4ef9-bf8d-ac293f745e3c';

-- =========================================================
-- Bloco 5 — Corrigir num=7 duplicado e preparar contador atomico
-- =========================================================

-- 5a. Verificar maior numero atual.
SELECT MAX(num) AS maior_num
FROM pedidos
WHERE filial_id = '1775090288241-wvcx73';

-- 5b. Verificar duplicados antes.
SELECT id, num, cli, criado_em
FROM pedidos
WHERE filial_id = '1775090288241-wvcx73'
  AND num = 7
ORDER BY criado_em;

-- Correcao: ajustar 11 conforme MAX(num) + 1 do SELECT acima.
UPDATE pedidos
SET num = 11
WHERE id = 'a786908b-3c20-4e6b-8216-8b4af8f93b5f';

-- Verificacao apos.
SELECT id, num, cli, criado_em
FROM pedidos
WHERE filial_id = '1775090288241-wvcx73'
ORDER BY num, criado_em;

-- 5c. A correcao permanente fica em sql/21_pedidos_numero_atomico.sql.
-- Aplicar a migration 21 depois de corrigir duplicados em homologacao.

-- =========================================================
-- Bloco 6 — Baixa manual das contas ja recebidas
-- =========================================================
-- NAO fazer em lote. Usar a RPC para cada conta confirmada pelo humano.
-- Exemplo por conta:
/*
SELECT id, pedido_id, pedido_num, cliente, valor, valor_em_aberto, status
FROM contas_receber
WHERE pedido_id = '<id_do_pedido>';

SELECT public.rpc_registrar_baixa(
  gen_random_uuid()::text,
  '<id_da_conta_receber>',
  <valor_recebido>,
  '<data_real_do_recebimento>'::timestamptz,
  'Baixa manual retroativa confirmada pelo humano em 2026-05-10.'
);
*/
