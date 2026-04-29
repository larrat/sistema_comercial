import { create } from 'zustand';
import type { Pedido } from '../../../../types/domain';
import type { PedidoFiltro, PedidoSummary, PedidoTab } from '../types';
import { TAB_STATUSES, normalizePedStatus } from '../types';

export type PedidoStoreState = {
  pedidos: Pedido[];
  summary: PedidoSummary;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  activeTab: PedidoTab;
  filtro: PedidoFiltro;
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  /** IDs com operação assíncrona em andamento (evita double-submit) */
  inFlight: Set<string>;
};

export type PedidoStoreActions = {
  setPedidosPage: (_payload: {
    pedidos: Pedido[];
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  }) => void;
  setSummary: (_summary: PedidoSummary) => void;
  setStatus: (_status: PedidoStoreState['status'], _error?: string) => void;
  setActiveTab: (_tab: PedidoTab) => void;
  setFiltro: (_patch: Partial<PedidoFiltro>) => void;
  clearFiltro: () => void;
  setPage: (_page: number) => void;
  setPageSize: (_pageSize: number) => void;
  upsertPedido: (_pedido: Pedido) => void;
  setInFlight: (_id: string, _active: boolean) => void;
};

const FILTRO_VAZIO: PedidoFiltro = {
  q: '',
  status: '',
  pgto: '',
  periodo: '',
  sort: 'data_desc'
};

const EMPTY_SUMMARY: PedidoSummary = {
  total: 0,
  emAbertoCount: 0,
  valorEmAberto: 0,
  entreguesCount: 0,
  canceladosCount: 0
};

function adjustSummary(
  summary: PedidoSummary,
  prev: Pick<Pedido, 'status' | 'total'> | null,
  next: Pick<Pedido, 'status' | 'total'>
): PedidoSummary {
  const draft = { ...summary };

  function removeStatus(status: string, total: number | undefined) {
    const normalized = normalizePedStatus(status);
    if (TAB_STATUSES.emaberto.includes(normalized)) {
      draft.emAbertoCount = Math.max(0, draft.emAbertoCount - 1);
      draft.valorEmAberto = Math.max(0, draft.valorEmAberto - (total ?? 0));
      return;
    }
    if (TAB_STATUSES.entregues.includes(normalized)) {
      draft.entreguesCount = Math.max(0, draft.entreguesCount - 1);
      return;
    }
    if (TAB_STATUSES.cancelados.includes(normalized)) {
      draft.canceladosCount = Math.max(0, draft.canceladosCount - 1);
    }
  }

  function addStatus(status: string, total: number | undefined) {
    const normalized = normalizePedStatus(status);
    if (TAB_STATUSES.emaberto.includes(normalized)) {
      draft.emAbertoCount += 1;
      draft.valorEmAberto += total ?? 0;
      return;
    }
    if (TAB_STATUSES.entregues.includes(normalized)) {
      draft.entreguesCount += 1;
      return;
    }
    if (TAB_STATUSES.cancelados.includes(normalized)) {
      draft.canceladosCount += 1;
    }
  }

  if (prev) removeStatus(prev.status ?? '', prev.total);
  else draft.total += 1;

  addStatus(next.status ?? '', next.total);
  return draft;
}

export function selectPedidosForTab(state: PedidoStoreState): Pedido[] {
  const tabStatuses = TAB_STATUSES[state.activeTab];
  let list = state.pedidos.filter((p) => tabStatuses.includes(normalizePedStatus(p.status)));

  if (state.filtro.q) {
    const q = state.filtro.q.toLowerCase();
    list = list.filter(
      (p) =>
        String(p.cli ?? '')
          .toLowerCase()
          .includes(q) || String(p.num ?? '').includes(q)
    );
  }

  if (state.filtro.status) {
    list = list.filter((p) => normalizePedStatus(p.status) === state.filtro.status);
  }

  return list;
}

export const usePedidoStore = create<PedidoStoreState & PedidoStoreActions>((set) => ({
  pedidos: [],
  summary: { ...EMPTY_SUMMARY },
  status: 'idle',
  error: null,
  activeTab: 'emaberto',
  filtro: { ...FILTRO_VAZIO },
  page: 1,
  pageSize: 20,
  total: 0,
  pageCount: 1,
  inFlight: new Set(),

  setPedidosPage: ({ pedidos, page, pageSize, total, pageCount }) =>
    set({ pedidos, page, pageSize, total, pageCount, status: 'ready', error: null }),
  setSummary: (summary) => set({ summary }),
  setStatus: (status, error) => set({ status, error: error ?? null }),
  setActiveTab: (activeTab) => set({ activeTab, filtro: { ...FILTRO_VAZIO }, page: 1 }),
  setFiltro: (patch) => set((s) => ({ filtro: { ...s.filtro, ...patch }, page: 1 })),
  clearFiltro: () => set({ filtro: { ...FILTRO_VAZIO }, page: 1 }),
  setPage: (page) => set({ page: Math.max(1, page) }),
  setPageSize: (pageSize) => set({ pageSize: Math.max(1, pageSize), page: 1 }),
  upsertPedido: (pedido) =>
    set((state) => {
      const previous = state.pedidos.find((p) => p.id === pedido.id) ?? null;
      const pedidos = previous
        ? state.pedidos.map((p) => (p.id === pedido.id ? pedido : p))
        : [pedido, ...state.pedidos].slice(0, Math.max(1, state.pageSize));
      const summary = adjustSummary(state.summary, previous, pedido);
      const total = previous ? state.total : state.total + 1;
      return {
        pedidos,
        summary,
        total,
        pageCount: Math.max(1, Math.ceil(total / state.pageSize))
      };
    }),
  setInFlight: (id, active) =>
    set((state) => {
      const next = new Set(state.inFlight);
      if (active) next.add(id);
      else next.delete(id);
      return { inFlight: next };
    })
}));
