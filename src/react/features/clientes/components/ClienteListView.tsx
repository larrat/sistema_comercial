import { useEffect } from 'react';
import { useShallow } from 'zustand/shallow';

import { useClienteStore, selectFilteredClientes, selectSegmentos } from '../store/useClienteStore';
import { ClienteCard } from './ClienteCard';

type ToolbarProps = {
  onNovoCliente?: () => void;
  onExportar?: () => void;
};

function ClienteToolbar({ onNovoCliente, onExportar }: ToolbarProps) {
  const filtro = useClienteStore((s) => s.filtro);
  const setFiltro = useClienteStore((s) => s.setFiltro);
  const clearFiltro = useClienteStore((s) => s.clearFiltro);
  const segmentos = useClienteStore(useShallow(selectSegmentos));

  const temFiltro = !!(filtro.q || filtro.seg || filtro.status);

  return (
    <div className="toolbar-shell--section" data-testid="cliente-toolbar">
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
        <button className="btn btn-p btn-sm" onClick={onNovoCliente} data-testid="novo-btn">
          Novo cliente
        </button>
      )}
    </div>
  );
}

function ClienteMetrics() {
  const clientes = useClienteStore(useShallow((s) => s.clientes));
  const filtrados = useClienteStore(useShallow(selectFilteredClientes));

  const ativos = clientes.filter((c) => c.status === 'ativo').length;
  const prospectos = clientes.filter((c) => c.status === 'prospecto').length;

  return (
    <div className="bento-band" data-testid="cliente-metrics">
      <div className="met">
        <div className="ml">Total</div>
        <div className="mv">{clientes.length}</div>
      </div>
      <div className="met">
        <div className="ml">Ativos</div>
        <div className="mv">{ativos}</div>
      </div>
      <div className="met">
        <div className="ml">Prospectos</div>
        <div className="mv">{prospectos}</div>
      </div>
      <div className="met">
        <div className="ml">Filtrados</div>
        <div className="mv">{filtrados.length}</div>
      </div>
    </div>
  );
}

function ClienteEmptyState({ hasData }: { hasData: boolean }) {
  return (
    <div className="empty" data-testid="empty-state">
      <div className="ico">CL</div>
      <p>
        {hasData
          ? 'Nenhum cliente encontrado com os filtros atuais.'
          : 'Clique em "Novo cliente" para cadastrar o primeiro.'}
      </p>
    </div>
  );
}

function ClienteListSkeleton() {
  return (
    <div className="sk-card" data-testid="skeleton">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="sk-line" />
      ))}
    </div>
  );
}

type Props = {
  onNovoCliente?: () => void;
  onDetalhe?: (id: string) => void;
  onEditar?: (id: string) => void;
  onExcluir?: (id: string) => void;
  onExportar?: () => void;
};

export function ClienteListView({
  onNovoCliente,
  onDetalhe,
  onEditar,
  onExcluir,
  onExportar
}: Props) {
  const status = useClienteStore((s) => s.status);
  const error = useClienteStore((s) => s.error);
  const clientes = useClienteStore(useShallow((s) => s.clientes));
  const filtrados = useClienteStore(useShallow(selectFilteredClientes));

  const setStatus = useClienteStore((s) => s.setStatus);
  useEffect(() => {
    if (status === 'idle') setStatus('loading');
  }, [status, setStatus]);

  return (
    <div className="screen-content" data-testid="cliente-list-view">
      <div className="fb form-gap-bottom-xs">
        <h2 className="table-cell-strong">Clientes</h2>
      </div>

      {status === 'ready' && <ClienteMetrics />}

      {status === 'ready' && (
        <ClienteToolbar onNovoCliente={onNovoCliente} onExportar={onExportar} />
      )}

      {status === 'loading' && <ClienteListSkeleton />}

      {status === 'error' && (
        <div className="empty" data-testid="error-state">
          <p>{error ?? 'Erro ao carregar clientes.'}</p>
        </div>
      )}

      {status === 'ready' && filtrados.length === 0 && (
        <ClienteEmptyState hasData={clientes.length > 0} />
      )}

      {status === 'ready' && filtrados.length > 0 && (
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
    </div>
  );
}
