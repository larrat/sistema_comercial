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
  EstoqueView,
  EstoquePeriodoFilter,
  Avaria
} from '../types';

type EstoqueStoreState = {
  view: EstoqueView;
  periodo: EstoquePeriodoFilter;
  buscaPosicao: string;
  statusFilter: EstoqueStatusFilter;
  categoriaFilter: string;
  buscaHistorico: string;
  tipoHistorico: EstoqueMovementType;
  metrics: EstoqueMetrics;
  snapshot: EstoquePositionSnapshot | null;
  positionRows: EstoquePositionRow[];
  historyRows: EstoqueHistoryRow[];
  avarias: Avaria[];
  movementModalOpen: boolean;
  avariaModalOpen: boolean;
  movementDraft: EstoqueMovementDraft;
  reloadVersion: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
};

type EstoqueStoreActions = {
  setView: (view: EstoqueView) => void;
  setPeriodo: (periodo: EstoquePeriodoFilter) => void;
  setBuscaPosicao: (value: string) => void;
  setStatusFilter: (value: EstoqueStatusFilter) => void;
  setCategoriaFilter: (value: string) => void;
  setBuscaHistorico: (value: string) => void;
  setTipoHistorico: (value: EstoqueMovementType) => void;
  setData: (payload: {
    snapshot?: EstoquePositionSnapshot | null;
    metrics: EstoqueMetrics;
    positionRows: EstoquePositionRow[];
    historyRows: EstoqueHistoryRow[];
    avarias?: Avaria[];
  }) => void;
  openMovementModal: (produtoId?: string, tipo?: EstoqueMovementMode) => void;
  closeMovementModal: () => void;
  openAvariaModal: () => void;
  closeAvariaModal: () => void;
  updateMovementDraft: (patch: Partial<EstoqueMovementDraft>) => void;
  requestReload: () => void;
  setStatus: (status: EstoqueStoreState['status'], error?: string | null) => void;
};

const EMPTY_METRICS: EstoqueMetrics = {
  produtos: 0,
  valorEmEstoque: 0,
  valorEmEstoqueTendency: null,
  emAlerta: 0,
  zerados: 0,
  giroMedio: 0,
  giroMedioTendency: null
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
    saldoReal: '',
    destinoFilialId: ''
  };
}

export const useEstoqueStore = create<EstoqueStoreState & EstoqueStoreActions>((set) => ({
  view: 'posicao',
  periodo: 'mes',
  buscaPosicao: '',
  statusFilter: '',
  categoriaFilter: '',
  buscaHistorico: '',
  tipoHistorico: '',
  metrics: EMPTY_METRICS,
  snapshot: null,
  positionRows: [],
  historyRows: [],
  avarias: [],
  movementModalOpen: false,
  avariaModalOpen: false,
  movementDraft: createMovementDraft(),
  reloadVersion: 0,
  status: 'idle',
  error: null,

  setView: (view) => set({ view }),
  setPeriodo: (periodo) => set({ periodo }),
  setBuscaPosicao: (buscaPosicao) => set({ buscaPosicao }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setCategoriaFilter: (categoriaFilter) => set({ categoriaFilter }),
  setBuscaHistorico: (buscaHistorico) => set({ buscaHistorico }),
  setTipoHistorico: (tipoHistorico) => set({ tipoHistorico }),
  setData: ({ snapshot = null, metrics, positionRows, historyRows, avarias = [] }) =>
    set({
      snapshot,
      metrics,
      positionRows,
      historyRows,
      avarias,
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
  openAvariaModal: () => set({ avariaModalOpen: true }),
  closeAvariaModal: () => set({ avariaModalOpen: false }),
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
