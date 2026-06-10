-- 23_contas_pagar_v1.sql
-- Estrutura para Contas a Pagar (Espelho de Contas a Receber)

begin;

create table if not exists public.contas_pagar (
  id                text        primary key,
  filial_id         text        not null,
  pedido_compra_id  text,
  fornecedor_nome   text        not null,
  valor             numeric     not null default 0,
  vencimento        date        not null,
  status            text        not null default 'pendente', -- pendente | pago | cancelado
  pago_em           timestamptz,
  categoria         text        default 'Mercadoria',
  obs               text,
  criado_em         timestamptz not null default now()
);

-- Índices
create index if not exists ix_cp_filial_status on public.contas_pagar(filial_id, status);
create index if not exists ix_cp_vencimento on public.contas_pagar(vencimento);

-- RLS
alter table public.contas_pagar enable row level security;

create policy p_contas_pagar_all on public.contas_pagar
  for all to authenticated
  using (public.can_access_filial(filial_id))
  with check (public.can_access_filial(filial_id));

commit;
