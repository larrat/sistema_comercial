import { useEstoqueStore } from '../store/useEstoqueStore';

export function useEstoqueFilters() {
  const view = useEstoqueStore((s) => s.view);
  const buscaPosicao = useEstoqueStore((s) => s.buscaPosicao);
  const statusFilter = useEstoqueStore((s) => s.statusFilter);
  const buscaHistorico = useEstoqueStore((s) => s.buscaHistorico);
  const tipoHistorico = useEstoqueStore((s) => s.tipoHistorico);

  const setView = useEstoqueStore((s) => s.setView);
  const setBuscaPosicao = useEstoqueStore((s) => s.setBuscaPosicao);
  const setStatusFilter = useEstoqueStore((s) => s.setStatusFilter);
  const setBuscaHistorico = useEstoqueStore((s) => s.setBuscaHistorico);
  const setTipoHistorico = useEstoqueStore((s) => s.setTipoHistorico);

  return {
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
  };
}
