-- Migration: 92_auth_rbac_deepening
-- Propósito: Criar infraestrutura nativa para Multi-Tenancy (Filiais) e RBAC abstrato (Permissões)

-- 1. Tabelas de Estrutura de Cargos e Permissões
create table if not exists public.permissoes (
    id text primary key, -- ex: 'pedido:write', 'estoque:override'
    descricao text not null,
    criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.cargos (
    id text primary key, -- ex: 'admin', 'gerente', 'vendedor'
    nome text not null,
    nivel integer default 10, -- 1 = lowest, 100 = highest
    criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.cargos_permissoes (
    cargo_id text references public.cargos(id) on delete cascade,
    permissao_id text references public.permissoes(id) on delete cascade,
    primary key (cargo_id, permissao_id)
);

-- 2. Tabela de Multi-Tenancy (Isolamento de Filiais por Usuário)
-- Relaciona um Auth User -> Filial -> Cargo
create table if not exists public.acessos_filiais (
    user_id uuid not null, -- referência ao auth.users (mantida frouxa no public schema)
    filial_id text not null, -- referência às filiais
    cargo_id text references public.cargos(id) on delete restrict,
    criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (user_id, filial_id)
);

-- Habilitar RLS
alter table public.permissoes enable row level security;
alter table public.cargos enable row level security;
alter table public.cargos_permissoes enable row level security;
alter table public.acessos_filiais enable row level security;

-- Policies Básicas de Leitura (Todos logados podem ler estruturas de acesso)
drop policy if exists "Leitura de permissões autenticada" on public.permissoes;
create policy "Leitura de permissões autenticada" on public.permissoes for select using (auth.role() = 'authenticated');

drop policy if exists "Leitura de cargos autenticada" on public.cargos;
create policy "Leitura de cargos autenticada" on public.cargos for select using (auth.role() = 'authenticated');

drop policy if exists "Leitura de mapeamento cargos autenticada" on public.cargos_permissoes;
create policy "Leitura de mapeamento cargos autenticada" on public.cargos_permissoes for select using (auth.role() = 'authenticated');

drop policy if exists "Leitura de acessos filiais do proprio usuario" on public.acessos_filiais;
create policy "Leitura de acessos filiais do proprio usuario" on public.acessos_filiais for select using (user_id = auth.uid());

-- 3. Inserção de Dados Básicos (Seed)
insert into public.permissoes (id, descricao) values
    ('admin:tudo', 'Acesso irrestrito a todas as funções'),
    ('pedido:read', 'Ler pedidos'),
    ('pedido:write', 'Criar e editar pedidos'),
    ('pedido:delete', 'Cancelar e excluir pedidos'),
    ('estoque:read', 'Ler saldos de estoque'),
    ('estoque:override', 'Forçar movimentações de estoque manual'),
    ('orcamento:write', 'Criar orçamentos')
on conflict (id) do nothing;

insert into public.cargos (id, nome, nivel) values
    ('admin', 'Administrador', 100),
    ('gerente', 'Gerente', 80),
    ('vendedor', 'Vendedor', 40),
    ('operador', 'Operador de Caixa', 20)
on conflict (id) do nothing;

-- Admin tem acesso total
insert into public.cargos_permissoes (cargo_id, permissao_id)
select 'admin', id from public.permissoes
on conflict do nothing;

-- 4. Função Otimizada para o Frontend carregar no Login
create or replace function public.get_user_context()
returns jsonb as $$
declare
    v_user_id uuid := auth.uid();
    v_filiais jsonb;
begin
    -- Monta array de filiais e as permissões do usuário em cada filial
    select jsonb_agg(
        jsonb_build_object(
            'filial_id', af.filial_id,
            'cargo_id', af.cargo_id,
            'permissoes', (
                select jsonb_agg(cp.permissao_id)
                from public.cargos_permissoes cp
                where cp.cargo_id = af.cargo_id
            )
        )
    ) into v_filiais
    from public.acessos_filiais af
    where af.user_id = v_user_id;

    return v_filiais;
end;
$$ language plpgsql security definer;

-- 5. Seed automático dos usuários antigos
-- Usamos um bloco DO para rodar como superuser e puxar dados de auth.users
do $$
declare
    v_user record;
    v_filial_id text;
    v_cargo text;
begin
    -- Itera sobre usuários existentes no auth.users
    for v_user in select id, raw_user_meta_data from auth.users loop
        -- Extrai o filial_id do metadata antigo
        v_filial_id := v_user.raw_user_meta_data->>'filial_id';
        v_cargo := v_user.raw_user_meta_data->>'role';
        
        -- Fallback: se não tiver cargo, define como admin temporário para não quebrar acesso
        if v_cargo is null or v_cargo = '' then
            v_cargo := 'admin';
        end if;
        
        -- Garante que se o filial_id existir, a gente cria o acesso
        if v_filial_id is not null and v_filial_id != '' then
            insert into public.acessos_filiais (user_id, filial_id, cargo_id)
            values (v_user.id, v_filial_id, v_cargo)
            on conflict (user_id, filial_id) do nothing;
        end if;
    end loop;
end;
$$;

commit;
