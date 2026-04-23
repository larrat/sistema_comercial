import { create } from 'zustand';

import type {
  EstoqueHistoryRow,
  EstoqueMetrics,
  EstoqueMovementDraft,
  EstoqueMovementMode,
  EstoquePositionSnapshot,
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
  snapshot: EstoquePositionSnapshot | null;
  positionRows: EstoquePositionRow[];
  historyRows: EstoqueHistoryRow[];
  movementModalOpen: boolean;
  movementDraft: EstoqueMovementDraft;
  reloadVersion: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
};

type EstoqueStoreActions = {
  setView: (view: EstoqueView) => void;
  setBuscaPosicao: (value: string) => void;
  setStatusFilter: (value: EstoqueStatusFilter) => void;
  setBuscaHistorico: (value: string) => void;
  setTipoHistorico: (value: EstoqueMovementType) => void;
  setData: (payload: {
    snapshot?: EstoquePositionSnapshot | null;
    metrics: EstoqueMetrics;
    positionRows: EstoquePositionRow[];
    historyRows: EstoqueHistoryRow[];
  }) => void;
  openMovementModal: (produtoId?: string, tipo?: EstoqueMovementMode) => void;
  closeMovementModal: () => void;
  updateMovementDraft: (patch: Partial<EstoqueMovementDraft>) => void;
  requestReload: () => void;
  setStatus: (status: EstoqueStoreState['status'], error?: string | null) => void;
};

const EMPTY_METRICS: EstoqueMetrics = {
  produtos: 0,
  valorEmEstoque: 0,
  emAlerta: 0,
  zerados: 0
};

function createMovementDraft(
  produtoId = '',
  tipo: EstoqueMovementMode = 'entrada'
): EstoqueMovementDraft {
  return {
    produtoId,
    tipo,
    data: new Date().toISOString().split('T')[0],
    quantidade: '',
    custo: '',
    observacao: '',
    saldoReal: ''
  };
}

export const useEstoqueStore = create<EstoqueStoreState & EstoqueStoreActions>((set) => ({
  view: 'posicao',
  buscaPosicao: '',
  statusFilter: '',
  buscaHistorico: '',
  tipoHistorico: '',
  metrics: EMPTY_METRICS,
  snapshot: null,
  positionRows: [],
  historyRows: [],
  movementModalOpen: false,
  movementDraft: createMovementDraft(),
  reloadVersion: 0,
  status: 'idle',
  error: null,

  setView: (view) => set({ view }),
  setBuscaPosicao: (buscaPosicao) => set({ buscaPosicao }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setBuscaHistorico: (buscaHistorico) => set({ buscaHistorico }),
  setTipoHistorico: (tipoHistorico) => set({ tipoHistorico }),
  setData: ({ snapshot = null, metrics, positionRows, historyRows }) =>
    set({
      snapshot,
      metrics,
      positionRows,
      historyRows,
      status: 'ready',
      error: null
    }),
  openMovementModal: (produtoId = '', tipo = 'entrada') =>
    set({
      movementModalOpen: true,
      movementDraft: createMovementDraft(produtoId, tipo)
    }),
  closeMovementModal: () =>
    set({
      movementModalOpen: false,
      movementDraft: createMovementDraft()
    }),
  updateMovementDraft: (patch) =>
    set((state) => ({
      movementDraft: {
        ...state.movementDraft,
        ...patch
      }
    })),
  requestReload: () => set((state) => ({ reloadVersion: state.reloadVersion + 1 })),
  setStatus: (status, error = null) => set({ status, error })
}));
