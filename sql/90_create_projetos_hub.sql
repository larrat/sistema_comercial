-- Script 90: Hub Central (Projetos / Obras)

begin;

create table if not exists public.projetos (
    id uuid primary key default gen_random_uuid(),
    filial_id text not null,
    cliente_id text references public.clientes(id) on delete restrict,
    nome text not null,
    endereco jsonb, -- { logradouro, numero, complemento, bairro, cep, cidade, estado }
    status text not null default 'em_andamento' check (status in ('em_andamento', 'concluido', 'cancelado')),
    criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
    atualizado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Projetos
alter table public.projetos enable row level security;

drop policy if exists "Usuários podem ver projetos da sua filial" on public.projetos;
create policy "Usuários podem ver projetos da sua filial"
    on public.projetos for select
    using (filial_id = (select (auth.jwt() -> 'user_metadata' ->> 'filial_id')));

drop policy if exists "Usuários podem inserir projetos na sua filial" on public.projetos;
create policy "Usuários podem inserir projetos na sua filial"
    on public.projetos for insert
    with check (filial_id = (select (auth.jwt() -> 'user_metadata' ->> 'filial_id')));

drop policy if exists "Usuários podem atualizar projetos da sua filial" on public.projetos;
create policy "Usuários podem atualizar projetos da sua filial"
    on public.projetos for update
    using (filial_id = (select (auth.jwt() -> 'user_metadata' ->> 'filial_id')));

drop policy if exists "Usuários podem excluir projetos da sua filial" on public.projetos;
create policy "Usuários podem excluir projetos da sua filial"
    on public.projetos for delete
    using (filial_id = (select (auth.jwt() -> 'user_metadata' ->> 'filial_id')));

drop trigger if exists handle_updated_at on public.projetos;
create trigger handle_updated_at before update on public.projetos
  for each row execute procedure public.set_atualizado_em();


-- Vínculos no Levantamento
alter table public.levantamentos_arquitetura add column if not exists projeto_id uuid references public.projetos(id) on delete cascade;

-- Vínculos em Orcamentos
alter table public.orcamentos_obra add column if not exists projeto_id uuid references public.projetos(id) on delete cascade;

-- Vínculos em Pedidos
-- Nota: Pedido.id é text no banco atual (por causa de syncs), mas podemos referenciar o projeto.
alter table public.pedidos add column if not exists projeto_id uuid references public.projetos(id) on delete set null;

commit;
