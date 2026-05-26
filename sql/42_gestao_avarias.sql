-- Migração 42: Gestão de Avarias e Descartes (Controle de Perdas)

begin;

-- Tabela de Avarias
create table if not exists public.avarias (
  id                  uuid          primary key default gen_random_uuid(),
  filial_id           text          not null references public.filiais(id) on delete cascade,
  produto_id          text          not null references public.produtos(id) on delete cascade,
  quantidade          numeric(12,2) not null check (quantidade > 0),
  custo_unitario      numeric(12,2) not null default 0 check (custo_unitario >= 0),
  valor_custo_perda   numeric(12,2) not null default 0 check (valor_custo_perda >= 0),
  motivo              text          not null, -- 'quebra' | 'defeito_fabrica' | 'vencido' | 'furto' | 'outro'
  destino             text          not null, -- 'descarte' | 'devolucao_fornecedor' | 'doacao'
  observacoes         text,
  criado_por          uuid          references auth.users(id) on delete set null,
  criado_em           timestamptz   not null default now()
);

-- Índices para Performance e Integridade
create index if not exists ix_avarias_filial on public.avarias(filial_id);
create index if not exists ix_avarias_produto on public.avarias(produto_id);

-- Ativar RLS
alter table public.avarias enable row level security;

-- Política de RLS para filial
do $$ begin
  create policy p_avarias_all on public.avarias
    for all to authenticated
    using (public.can_access_filial(filial_id))
    with check (public.can_access_filial(filial_id));
exception
  when duplicate_object then null;
end $$;

commit;
