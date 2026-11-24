insert into public.pedidos (id, filial_id, num, status, fiscal_status)
values ('PED-DEMO-42', 'FILIAL-DEMO', 42, 'concluido', 'pendente');

insert into public.pedido_itens (pedido_id, filial_id, produto_id, qty, custo, preco)
values ('PED-DEMO-42', 'FILIAL-DEMO', 'PROD-DEMO', 3, 30, 50);

insert into public.contas_receber
  (id, pedido_id, filial_id, status, valor, valor_em_aberto, valor_recebido, recebido_em, ultimo_recebimento_em)
values
  ('REC-DEMO-42', 'PED-DEMO-42', 'FILIAL-DEMO', 'parcial', 150, 100, 50, '2026-01-15T10:00:00Z', '2026-01-15T10:00:00Z');

insert into public.contas_receber_baixas (id, conta_receber_id)
values ('BAIXA-DEMO-42', 'REC-DEMO-42');

insert into public.movimentacoes
  (id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts)
values
  ('MOV-SALDO-DEMO', 'FILIAL-DEMO', 'PROD-DEMO', 'PROD-DEMO', 'entrada', '2026-01-15', 10, 30, 'Saldo inicial fictício', 1),
  ('MOV-SAIDA-DEMO', 'FILIAL-DEMO', 'PROD-DEMO', 'PROD-DEMO', 'saida', '2026-01-15', 3, 30, 'Saída da venda fictícia', 2);
