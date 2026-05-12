import { useMemo } from 'react';
import { PageHeader, FilterBar, DataTable, ActionMenu, StatusBadge } from '../../../shared/ui';
import { useRcasStore } from '../store/useRcasStore';
import { useRcasMutations } from '../hooks/useRcasMutations';
import { RcaDrawer } from './RcaDrawer';
import type { Rca } from '../../../../types/domain';

export function RcasPage() {
  const rcas = useRcasStore((s) => s.rcas);
  const loading = useRcasStore((s) => s.loading);
  const error = useRcasStore((s) => s.error);
  const query = useRcasStore((s) => s.query);
  const statusFilter = useRcasStore((s) => s.statusFilter);
  const setQuery = useRcasStore((s) => s.setQuery);
  const setStatusFilter = useRcasStore((s) => s.setStatusFilter);
  const openDrawer = useRcasStore((s) => s.openDrawer);

  const { desativar } = useRcasMutations();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rcas.filter((r) => {
      const matchQuery = !q || r.nome.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'ativos' && r.ativo !== false) ||
        (statusFilter === 'inativos' && r.ativo === false);
      return matchQuery && matchStatus;
    });
  }, [rcas, query, statusFilter]);

  const activeFilterCount = (query ? 1 : 0) + (statusFilter !== 'todos' ? 1 : 0);

  const columns = [
    {
      key: 'nome',
      header: 'Vendedor',
      render: (r: Rca) => (
        <span className="rf-rca-nome-cell">
          <span className="rf-rca-inicial">{r.inicial || r.nome.slice(0, 2).toUpperCase()}</span>
          {r.nome}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (r: Rca) =>
        r.ativo !== false ? (
          <StatusBadge tone="success">Ativo</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Inativo</StatusBadge>
        )
    }
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex flex-col gap-6">
      <PageHeader
        kicker="Cadastros"
        title="Vendedores"
        description="Cadastro e gestão de vendedores (RCAs) da filial."
        actions={
          <button className="btn btn-p btn-sm" type="button" onClick={() => openDrawer()}>
            + Novo vendedor
          </button>
        }
      />

      <FilterBar
        search={{
          value: query,
          onChange: setQuery,
          placeholder: 'Buscar por nome…'
        }}
        filters={[
          {
            key: 'status',
            value: statusFilter,
            onChange: (v) => setStatusFilter(v as 'todos' | 'ativos' | 'inativos'),
            options: [
              { value: 'todos', label: 'Todos' },
              { value: 'ativos', label: 'Ativos' },
              { value: 'inativos', label: 'Inativos' }
            ]
          }
        ]}
        activeFilterCount={activeFilterCount}
        onClearFilters={() => {
          setQuery('');
          setStatusFilter('todos');
        }}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        loading={loading}
        error={error ?? undefined}
        emptyTitle="Nenhum vendedor encontrado."
        emptyDescription={
          activeFilterCount > 0
            ? 'Tente ajustar os filtros.'
            : 'Cadastre o primeiro vendedor para começar a vincular pedidos e clientes.'
        }
        emptyAction={
          activeFilterCount === 0 ? (
            <button className="btn btn-p" type="button" onClick={() => openDrawer()}>
              Cadastrar vendedor
            </button>
          ) : undefined
        }
        renderActions={(r) => (
          <ActionMenu
            items={[
              { key: 'editar', label: 'Editar', onClick: () => openDrawer(r) },
              ...(r.ativo !== false
                ? [
                    {
                      key: 'desativar',
                      label: 'Desativar',
                      danger: true,
                      onClick: () => void desativar(r.id)
                    }
                  ]
                : [])
            ]}
          />
        )}
      />

      <RcaDrawer />
    </main>
  );
}
