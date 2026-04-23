import { FilterBar } from '../../../shared/ui';
import { useEstoqueFilters } from '../hooks/useEstoqueFilters';

export function EstoqueFilters() {
  const {
    view,
    buscaPosicao,
    statusFilter,
    buscaHistorico,
    tipoHistorico,
    setView,
    setBuscaPosicao,
    setStatusFilter,
    setBuscaHistorico,
    setTipoHistorico
  } = useEstoqueFilters();

  return (
    <div className="rf-ui-stack">
      <div className="tabs">
        <button className={`tb ${view === 'posicao' ? 'on' : ''}`} type="button" onClick={() => setView('posicao')}>
          Posição
        </button>
        <button className={`tb ${view === 'historico' ? 'on' : ''}`} type="button" onClick={() => setView('historico')}>
          Histórico
        </button>
      </div>

      {view === 'posicao' ? (
        <FilterBar>
          <input
            className="inp input-w-sm"
            placeholder="Buscar por nome ou SKU..."
            value={buscaPosicao}
            onChange={(event) => setBuscaPosicao(event.target.value)}
          />
          <select
            className="inp sel select-w-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            <option value="">Todos</option>
            <option value="ok">OK</option>
            <option value="baixo">Baixo</option>
            <option value="zerado">Zerado</option>
          </select>
        </FilterBar>
      ) : (
        <FilterBar>
          <input
            className="inp input-w-sm"
            placeholder="Buscar no histórico..."
            value={buscaHistorico}
            onChange={(event) => setBuscaHistorico(event.target.value)}
          />
          <select
            className="inp sel select-w-sm"
            value={tipoHistorico}
            onChange={(event) => setTipoHistorico(event.target.value as typeof tipoHistorico)}
          >
            <option value="">Todos os tipos</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="ajuste">Ajuste</option>
            <option value="transf">Transferência</option>
          </select>
        </FilterBar>
      )}
    </div>
  );
}
