-- Script 89: Tabela de Levantamentos de Arquitetura

begin;

create or replace function public.set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create table if not exists public.levantamentos_arquitetura (
    id uuid primary key default gen_random_uuid(),
    filial_id text not null,
    cliente_id text references public.clientes(id) on delete set null,
    nome_projeto text not null,
    status text not null default 'rascunho' check (status in ('rascunho', 'finalizado')),
    dados_cad jsonb not null default '[]'::jsonb, -- Array de Rooms
    criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
    atualizado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.levantamentos_arquitetura enable row level security;

create policy "Usuários podem ver levantamentos da sua filial"
    on public.levantamentos_arquitetura for select
    using (filial_id = (select (auth.jwt() -> 'user_metadata' ->> 'filial_id')));

create policy "Usuários podem inserir levantamentos na sua filial"
    on public.levantamentos_arquitetura for insert
    with check (filial_id = (select (auth.jwt() -> 'user_metadata' ->> 'filial_id')));

create policy "Usuários podem atualizar levantamentos da sua filial"
    on public.levantamentos_arquitetura for update
    using (filial_id = (select (auth.jwt() -> 'user_metadata' ->> 'filial_id')));

create policy "Usuários podem excluir levantamentos da sua filial"
    on public.levantamentos_arquitetura for delete
    using (filial_id = (select (auth.jwt() -> 'user_metadata' ->> 'filial_id')));

-- Trigger para atualizado_em
create trigger handle_updated_at before update on public.levantamentos_arquitetura
  for each row execute procedure public.set_atualizado_em();

commit;
