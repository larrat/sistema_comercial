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
  const activePositionFilters = [buscaPosicao, statusFilter].filter(Boolean).length;
  const activeHistoryFilters = [buscaHistorico, tipoHistorico].filter(Boolean).length;

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
        <FilterBar
          search={{
            value: buscaPosicao,
            onChange: setBuscaPosicao,
            placeholder: 'Buscar por produto ou SKU...',
            ariaLabel: 'Buscar na posição de estoque'
          }}
          filters={[
            {
              key: 'status',
              value: statusFilter,
              onChange: (value) => setStatusFilter(value as typeof statusFilter),
              ariaLabel: 'Filtrar posição por status',
              options: [
                { value: '', label: 'Todos os status' },
                { value: 'ok', label: 'OK' },
                { value: 'baixo', label: 'Baixo' },
                { value: 'zerado', label: 'Zerado' }
              ]
            }
          ]}
          activeFilterCount={activePositionFilters}
          onClearFilters={
            activePositionFilters ? () => {
              setBuscaPosicao('');
              setStatusFilter('');
            } : undefined
          }
        />
      ) : (
        <FilterBar
          search={{
            value: buscaHistorico,
            onChange: setBuscaHistorico,
            placeholder: 'Buscar por produto, observação ou data...',
            ariaLabel: 'Buscar no histórico de estoque'
          }}
          filters={[
            {
              key: 'tipo',
              value: tipoHistorico,
              onChange: (value) => setTipoHistorico(value as typeof tipoHistorico),
              ariaLabel: 'Filtrar histórico por tipo',
              options: [
                { value: '', label: 'Todos os tipos' },
                { value: 'entrada', label: 'Entrada' },
                { value: 'saida', label: 'Saída' },
                { value: 'ajuste', label: 'Ajuste' },
                { value: 'transf', label: 'Transferência' }
              ]
            }
          ]}
          activeFilterCount={activeHistoryFilters}
          onClearFilters={
            activeHistoryFilters ? () => {
              setBuscaHistorico('');
              setTipoHistorico('');
            } : undefined
          }
        />
      )}
    </div>
  );
}
