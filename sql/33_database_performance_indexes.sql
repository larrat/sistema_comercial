-- 33_database_performance_indexes.sql
-- Objetivo: Criar índices de chaves estrangeiras cruciais que estavam ausentes no banco.
-- Benefício: Acelera drasticamente JOINS internos do ERP e a velocidade de leitura das views do Power BI.
-- Idempotente: Pode rodar mais de uma vez.

begin;

-- ==========================================
-- 1. Módulo Financeiro e Caixa
-- ==========================================
create index if not exists ix_caixa_transacoes_categoria_id
  on public.caixa_transacoes (categoria_id);

-- ==========================================
-- 2. Módulo de Marketing e CRM
-- ==========================================
create index if not exists ix_campanha_envios_cliente_id
  on public.campanha_envios (cliente_id);

-- ==========================================
-- 3. Módulo de Fidelização de Clientes
-- ==========================================
create index if not exists ix_cliente_fidelidade_lancamentos_pedido_id
  on public.cliente_fidelidade_lancamentos (pedido_id);

-- ==========================================
-- 4. Módulo de Inteligência de Cotações
-- ==========================================
create index if not exists ix_cotacao_historico_fornecedor_id
  on public.cotacao_historico (fornecedor_id);

create index if not exists ix_cotacao_precos_fornecedor_id
  on public.cotacao_precos (fornecedor_id);

commit;
