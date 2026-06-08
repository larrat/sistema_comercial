import { FilterBar } from '../../../shared/ui';
import { useEstoqueFilters } from '../hooks/useEstoqueFilters';

export function EstoqueFilters() {
  const {
    view,
    periodo,
    buscaPosicao,
    statusFilter,
    categoriaFilter,
    buscaHistorico,
    tipoHistorico,
    categorias,
    setView,
    setPeriodo,
    setBuscaPosicao,
    setStatusFilter,
    setCategoriaFilter,
    setBuscaHistorico,
    setTipoHistorico
  } = useEstoqueFilters();
  const activePositionFilters = [buscaPosicao, statusFilter, categoriaFilter].filter(Boolean).length;
  const activeHistoryFilters = [buscaHistorico, tipoHistorico].filter(Boolean).length;

  return (
    <div className="rf-ui-stack">
      <div className="flex items-center justify-between">
        <div className="tabs">
          <button className={`tb ${view === 'posicao' ? 'on' : ''}`} type="button" onClick={() => setView('posicao')}>
            Posição
          </button>
          <button className={`tb ${view === 'historico' ? 'on' : ''}`} type="button" onClick={() => setView('historico')}>
            Histórico
          </button>
          <button className={`tb ${view === 'cobertura' ? 'on' : ''}`} type="button" onClick={() => setView('cobertura')}>
            Cobertura
          </button>
          <button className={`tb ${view === 'sem_movimento' ? 'on' : ''}`} type="button" onClick={() => setView('sem_movimento')}>
            Sem Movimento
          </button>
        </div>
        
        <select 
          className="rf-ui-select !w-[160px] !text-sm"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as any)}
          aria-label="Filtrar por período"
        >
          <option value="semana">Últimos 7 dias</option>
          <option value="mes">Últimos 30 dias</option>
          <option value="ano">Últimos 12 meses</option>
          <option value="tudo">Todo o período</option>
        </select>
      </div>

      {view === 'historico' ? (
        <FilterBar
          search={{
            value: buscaHistorico,
            onChange: setBuscaHistorico,
            placeholder: 'Buscar por produto, observação ou data…',
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
      ) : (
        <FilterBar
          search={{
            value: buscaPosicao,
            onChange: setBuscaPosicao,
            placeholder: 'Buscar por produto ou SKU…',
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
            },
            {
              key: 'categoria',
              value: categoriaFilter,
              onChange: (value) => setCategoriaFilter(value),
              ariaLabel: 'Filtrar posição por categoria',
              options: [
                { value: '', label: 'Todas as categorias' },
                ...categorias.map(c => ({ value: c.toLowerCase(), label: c }))
              ]
            }
          ]}
          activeFilterCount={activePositionFilters}
          onClearFilters={
            activePositionFilters ? () => {
              setBuscaPosicao('');
              setStatusFilter('');
              setCategoriaFilter('');
            } : undefined
          }
        />
      )}
    </div>
  );
}
