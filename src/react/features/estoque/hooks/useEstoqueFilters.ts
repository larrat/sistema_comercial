import { filterEstoqueHistoryRows, filterEstoquePositionRows } from './useEstoqueCalculations';
import { useEstoqueStore } from '../store/useEstoqueStore';

export function useEstoqueFilters() {
  const view = useEstoqueStore((s) => s.view);
  const periodo = useEstoqueStore((s) => s.periodo);
  const buscaPosicao = useEstoqueStore((s) => s.buscaPosicao);
  const statusFilter = useEstoqueStore((s) => s.statusFilter);
  const categoriaFilter = useEstoqueStore((s) => s.categoriaFilter);
  const buscaHistorico = useEstoqueStore((s) => s.buscaHistorico);
  const tipoHistorico = useEstoqueStore((s) => s.tipoHistorico);
  const positionRows = useEstoqueStore((s) => s.positionRows);
  const historyRows = useEstoqueStore((s) => s.historyRows);
  const snapshot = useEstoqueStore((s) => s.snapshot);

  const categorias = snapshot?.produtos
    ? Array.from(new Set(snapshot.produtos.map(p => p.cat || p.categoria || 'Sem categoria').filter(Boolean))).sort()
    : [];

  const setView = useEstoqueStore((s) => s.setView);
  const setPeriodo = useEstoqueStore((s) => s.setPeriodo);
  const setBuscaPosicao = useEstoqueStore((s) => s.setBuscaPosicao);
  const setStatusFilter = useEstoqueStore((s) => s.setStatusFilter);
  const setCategoriaFilter = useEstoqueStore((s) => s.setCategoriaFilter);
  const setBuscaHistorico = useEstoqueStore((s) => s.setBuscaHistorico);
  const setTipoHistorico = useEstoqueStore((s) => s.setTipoHistorico);

  return {
    view,
    periodo,
    buscaPosicao,
    statusFilter,
    categoriaFilter,
    buscaHistorico,
    tipoHistorico,
    positionRows: filterEstoquePositionRows(positionRows, buscaPosicao, statusFilter, categoriaFilter),
    historyRows: filterEstoqueHistoryRows(historyRows, buscaHistorico, tipoHistorico),
    categorias,
    setView,
    setPeriodo,
    setBuscaPosicao,
    setStatusFilter,
    setCategoriaFilter,
    setBuscaHistorico,
    setTipoHistorico
  };
}
