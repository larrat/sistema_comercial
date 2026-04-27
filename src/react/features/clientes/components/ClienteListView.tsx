import { useEffect } from 'react';
import { useShallow } from 'zustand/shallow';

import { EmptyState, FilterBar, StatCard } from '../../../shared/ui';
import { useClienteStore, selectFilteredClientes, selectSegmentos } from '../store/useClienteStore';
import { ClienteCard } from './ClienteCard';

type Props = {
  onNovoCliente?: () => void;
  onDetalhe?: (id: string) => void;
  onEditar?: (id: string) => void;
  onExcluir?: (id: string) => void;
  onExportar?: () => void;
  hidden?: boolean;
};

export function ClienteListView({
  onNovoCliente,
  onDetalhe,
  onEditar,
  onExcluir,
  onExportar,
  hidden = false
}: Props) {
  const status = useClienteStore((s) => s.status);
  const error = useClienteStore((s) => s.error);
  const clientes = useClienteStore(useShallow((s) => s.clientes));
  const filtrados = useClienteStore(useShallow(selectFilteredClientes));
  const filtro = useClienteStore((s) => s.filtro);
  const setFiltro = useClienteStore((s) => s.setFiltro);
  const clearFiltro = useClienteStore((s) => s.clearFiltro);
  const segmentos = useClienteStore(useShallow(selectSegmentos));
  const setStatus = useClienteStore((s) => s.setStatus);

  useEffect(() => {
    if (status === 'idle') setStatus('loading');
  }, [status, setStatus]);

  const ativos = clientes.filter((c) => c.status === 'ativo').length;
  const prospectos = clientes.filter((c) => c.status === 'prospecto').length;
  const temFiltro = !!(filtro.q || filtro.seg || filtro.status);

  return (
    <div data-testid="cliente-list-view" hidden={hidden}>
      {status === 'loading' && (
        <div className="sk-card" data-testid="skeleton">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="sk-line" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          title={error ?? 'Erro ao carregar clientes.'}
          compact
          data-testid="error-state"
        />
      )}

      {status === 'ready' && (
        <>
          <section className="rf-ui-stat-grid" data-testid="cliente-metrics">
            <StatCard label="Total" value={clientes.length} />
            <StatCard label="Ativos" value={ativos} tone="success" />
            <StatCard label="Prospectos" value={prospectos} />
            <StatCard label="Filtrados" value={filtrados.length} />
          </section>

          <FilterBar
            actions={
              <>
                {temFiltro && (
                  <button className="btn btn-sm" onClick={clearFiltro} data-testid="limpar-filtro">
                    Limpar filtros
                  </button>
                )}
                {onExportar && (
                  <button className="btn btn-sm" onClick={onExportar} data-testid="export-btn">
                    Exportar CSV
                  </button>
                )}
                {onNovoCliente && (
                  <button
                    className="btn btn-sm"
                    onClick={onNovoCliente}
                    data-testid="novo-btn"
                  >
                    Novo cliente
                  </button>
                )}
              </>
            }
          >
            <input
              className="inp"
              type="search"
              placeholder="Buscar..."
              value={filtro.q ?? ''}
              onChange={(e) => setFiltro({ q: e.target.value })}
              aria-label="Buscar clientes"
              data-testid="busca-input"
            />
            <select
              className="inp"
              value={filtro.seg ?? ''}
              onChange={(e) => setFiltro({ seg: e.target.value })}
              aria-label="Filtrar por segmento"
              data-testid="seg-select"
            >
              <option value="">Todos os segmentos</option>
              {segmentos.map((seg) => (
                <option key={seg} value={seg}>
                  {seg}
                </option>
              ))}
            </select>
            <select
              className="inp"
              value={filtro.status ?? ''}
              onChange={(e) => setFiltro({ status: e.target.value })}
              aria-label="Filtrar por status"
              data-testid="status-select"
            >
              <option value="">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="prospecto">Prospecto</option>
            </select>
          </FilterBar>

          {filtrados.length === 0 && (
            <EmptyState
              title={
                clientes.length > 0
                  ? 'Nenhum cliente encontrado com os filtros atuais.'
                  : 'Clique em "Novo cliente" para cadastrar o primeiro.'
              }
              data-testid="empty-state"
            />
          )}

          {filtrados.length > 0 && (
            <div className="flex flex-col gap-3" data-testid="cliente-list">
              {filtrados.map((cliente) => (
                <ClienteCard
                  key={cliente.id}
                  cliente={cliente}
                  onDetalhe={onDetalhe}
                  onEditar={onEditar}
                  onExcluir={onExcluir}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
