-- 22_pedidos_compra_v1.sql
-- Estrutura para Pedidos de Compra e Entrada de Mercadorias

begin;

create table if not exists public.pedidos_compra (
  id              text        primary key,
  filial_id       text        not null,
  fornecedor_id   text,       -- Opcional por enquanto
  fornecedor_nome text        not null,
  total           numeric     not null default 0,
  status          text        not null default 'aberto', -- aberto | finalizado | cancelado
  forma_pagamento text,
  obs             text,
  criado_por      uuid        references auth.users(id),
  criado_em       timestamptz not null default now(),
  finalizado_em   timestamptz
);

create table if not exists public.pedido_compra_itens (
  id                bigserial   primary key,
  pedido_compra_id  text        not null references public.pedidos_compra(id) on delete cascade,
  produto_id        text        not null,
  nome              text        not null,
  qty               numeric     not null default 0,
  custo_unitario    numeric     not null default 0,
  total_item        numeric     not null default 0,
  criado_em         timestamptz not null default now()
);

-- Índices
create index if not exists ix_pc_filial_status on public.pedidos_compra(filial_id, status);
create index if not exists ix_pci_pedido on public.pedido_compra_itens(pedido_compra_id);

-- RLS
alter table public.pedidos_compra enable row level security;
alter table public.pedido_compra_itens enable row level security;

create policy p_pedidos_compra_all on public.pedidos_compra
  for all to authenticated
  using (public.can_access_filial(filial_id))
  with check (public.can_access_filial(filial_id));

create policy p_pedido_compra_itens_all on public.pedido_compra_itens
  for all to authenticated
  using (exists (
    select 1 from public.pedidos_compra pc 
    where pc.id = pedido_compra_id and public.can_access_filial(pc.filial_id)
  ))
  with check (exists (
    select 1 from public.pedidos_compra pc 
    where pc.id = pedido_compra_id and public.can_access_filial(pc.filial_id)
  ));

commit;
