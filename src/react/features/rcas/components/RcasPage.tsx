import { useMemo } from 'react';
import { PageHeader, FilterBar, DataTable, ActionMenu, StatusBadge, SegmentedControl, Button, StatCard } from '../../../shared/ui';
import { useRcasStore } from '../store/useRcasStore';
import { useRcasMutations } from '../hooks/useRcasMutations';
import { RcaModal } from './RcaModal';
import type { Rca } from '../../../../types/domain';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import { RcaListMobile } from './RcaListMobile';

export function RcasPage() {
  const rcas = useRcasStore((s) => s.rcas);
  const loading = useRcasStore((s) => s.loading);
  const error = useRcasStore((s) => s.error);
  const query = useRcasStore((s) => s.query);
  const statusFilter = useRcasStore((s) => s.statusFilter);
  const setQuery = useRcasStore((s) => s.setQuery);
  const setStatusFilter = useRcasStore((s) => s.setStatusFilter);
  const openDrawer = useRcasStore((s) => s.openDrawer);
  const isMobile = useIsMobile(1024);

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
    <div className="w-full flex flex-col gap-8">
      <PageHeader
        kicker="Cadastros"
        title="Vendedores"
        description="Cadastro e gestão de vendedores (RCAs) da filial."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-3 lg:gap-6 mt-4 lg:mt-0 w-full lg:w-auto">
            <Button variant="primary" onClick={() => openDrawer()}>
              + Novo vendedor
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Total de Vendedores"
          value={rcas.length}
          tone="default"
        />
        <StatCard
          label="Ativos"
          value={rcas.filter(r => r.ativo !== false).length}
          tone="emerald"
        />
        <StatCard
          label="Inativos"
          value={rcas.filter(r => r.ativo === false).length}
          tone="warning"
        />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <SegmentedControl
          options={[
            { id: 'todos', label: 'Todos' },
            { id: 'ativos', label: 'Ativos' },
            { id: 'inativos', label: 'Inativos' }
          ]}
          activeId={statusFilter}
          onChange={(id) => setStatusFilter(id as 'todos' | 'ativos' | 'inativos')}
        />
      </div>

      <FilterBar
        search={{
          value: query,
          onChange: setQuery,
          placeholder: 'Buscar por nome…'
        }}
        activeFilterCount={query ? 1 : 0}
        onClearFilters={query ? () => setQuery('') : undefined}
      />

      {isMobile ? (
        <RcaListMobile
          rcas={filtered}
          onEdit={(r) => openDrawer(r)}
          onDesativar={(id) => void desativar(id)}
        />
      ) : (
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
              <Button variant="primary" onClick={() => openDrawer()}>
                Cadastrar vendedor
              </Button>
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
      )}

      <RcaModal />
    </div>
  );
}
