import { create } from 'zustand';

import type {
  EstoqueHistoryRow,
  EstoqueMetrics,
  EstoqueMovementType,
  EstoquePositionRow,
  EstoqueStatusFilter,
  EstoqueView
} from '../types';

type EstoqueStoreState = {
  view: EstoqueView;
  buscaPosicao: string;
  statusFilter: EstoqueStatusFilter;
  buscaHistorico: string;
  tipoHistorico: EstoqueMovementType;
  metrics: EstoqueMetrics;
  positionRows: EstoquePositionRow[];
  historyRows: EstoqueHistoryRow[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
};

type EstoqueStoreActions = {
  setView: (view: EstoqueView) => void;
  setBuscaPosicao: (value: string) => void;
  setStatusFilter: (value: EstoqueStatusFilter) => void;
  setBuscaHistorico: (value: string) => void;
  setTipoHistorico: (value: EstoqueMovementType) => void;
  setSkeletonData: (payload: {
    metrics: EstoqueMetrics;
    positionRows: EstoquePositionRow[];
    historyRows: EstoqueHistoryRow[];
  }) => void;
  setStatus: (status: EstoqueStoreState['status'], error?: string | null) => void;
};

const EMPTY_METRICS: EstoqueMetrics = {
  produtos: 0,
  valorEmEstoque: 0,
  emAlerta: 0,
  zerados: 0
};

export const useEstoqueStore = create<EstoqueStoreState & EstoqueStoreActions>((set) => ({
  view: 'posicao',
  buscaPosicao: '',
  statusFilter: '',
  buscaHistorico: '',
  tipoHistorico: '',
  metrics: EMPTY_METRICS,
  positionRows: [],
  historyRows: [],
  status: 'idle',
  error: null,

  setView: (view) => set({ view }),
  setBuscaPosicao: (buscaPosicao) => set({ buscaPosicao }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setBuscaHistorico: (buscaHistorico) => set({ buscaHistorico }),
  setTipoHistorico: (tipoHistorico) => set({ tipoHistorico }),
  setSkeletonData: ({ metrics, positionRows, historyRows }) =>
    set({
      metrics,
      positionRows,
      historyRows,
      status: 'ready',
      error: null
    }),
  setStatus: (status, error = null) => set({ status, error })
}));
