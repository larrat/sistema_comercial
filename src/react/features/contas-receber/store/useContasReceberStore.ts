import { create } from 'zustand';
import type { ContaReceber, ContaReceberBaixa } from '../../../../types/domain';

export type CrTab = 'pendentes' | 'vencidos' | 'recebidos';

export type ContasReceberStoreState = {
  contas: ContaReceber[];
  baixas: ContaReceberBaixa[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  activeTab: CrTab;
  searchQuery: string;
  inFlight: Set<string>;
};

export type ContasReceberStoreActions = {
  setContas: (_contas: ContaReceber[]) => void;
  setBaixas: (_baixas: ContaReceberBaixa[]) => void;
  setStatus: (_status: ContasReceberStoreState['status'], _error?: string) => void;
  setActiveTab: (_tab: CrTab) => void;
  setSearchQuery: (_q: string) => void;
  upsertConta: (_conta: ContaReceber) => void;
  syncBaixa: (_baixa: ContaReceberBaixa) => void;
  removeBaixa: (_baixaId: string) => void;
  removeBaixasByConta: (_contaId: string) => void;
  setInFlight: (_id: string, _active: boolean) => void;
};

export const useContasReceberStore = create<ContasReceberStoreState & ContasReceberStoreActions>(
  (set) => ({
    contas: [],
    baixas: [],
    status: 'idle',
    error: null,
    activeTab: 'pendentes',
    searchQuery: '',
    inFlight: new Set(),

    setContas: (contas) => set({ contas, status: 'ready', error: null }),
    setBaixas: (baixas) => set({ baixas }),
    setStatus: (status, error) => set({ status, error: error ?? null }),
    setActiveTab: (activeTab) => set({ activeTab, searchQuery: '' }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),

    upsertConta: (conta) =>
      set((state) => ({
        contas: state.contas.some((c) => c.id === conta.id)
          ? state.contas.map((c) => (c.id === conta.id ? conta : c))
          : [...state.contas, conta]
      })),

    syncBaixa: (baixa) =>
      set((state) => ({
        baixas: state.baixas.some((b) => b.id === baixa.id)
          ? state.baixas.map((b) => (b.id === baixa.id ? baixa : b))
          : [baixa, ...state.baixas]
      })),

    removeBaixa: (baixaId) =>
      set((state) => ({ baixas: state.baixas.filter((b) => b.id !== baixaId) })),

    removeBaixasByConta: (contaId) =>
      set((state) => ({ baixas: state.baixas.filter((b) => b.conta_receber_id !== contaId) })),

    setInFlight: (id, active) =>
      set((state) => {
        const next = new Set(state.inFlight);
        if (active) next.add(id);
        else next.delete(id);
        return { inFlight: next };
      })
  })
);
