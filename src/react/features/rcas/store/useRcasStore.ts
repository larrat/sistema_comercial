import { create } from 'zustand';
import type { Rca } from '../../../../types/domain';

type RcasState = {
  rcas: Rca[];
  loading: boolean;
  error: string | null;
  reloadKey: number;

  query: string;
  statusFilter: 'todos' | 'ativos' | 'inativos';

  drawerOpen: boolean;
  drawerEditId: string | null;
  drawerNome: string;
  saving: boolean;
};

type RcasActions = {
  setRcas: (rcas: Rca[]) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  requestReload: () => void;

  setQuery: (q: string) => void;
  setStatusFilter: (f: 'todos' | 'ativos' | 'inativos') => void;

  openDrawer: (rca?: Rca) => void;
  closeDrawer: () => void;
  setDrawerNome: (nome: string) => void;
  setSaving: (v: boolean) => void;
  upsertLocal: (rca: Rca) => void;
  deactivateLocal: (id: string) => void;
};

export const useRcasStore = create<RcasState & RcasActions>((set) => ({
  rcas: [],
  loading: false,
  error: null,
  reloadKey: 0,

  query: '',
  statusFilter: 'todos',

  drawerOpen: false,
  drawerEditId: null,
  drawerNome: '',
  saving: false,

  setRcas: (rcas) => set({ rcas }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  requestReload: () => set((s) => ({ reloadKey: s.reloadKey + 1 })),

  setQuery: (query) => set({ query }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),

  openDrawer: (rca) =>
    set({
      drawerOpen: true,
      drawerEditId: rca?.id ?? null,
      drawerNome: rca?.nome ?? ''
    }),
  closeDrawer: () => set({ drawerOpen: false, drawerEditId: null, drawerNome: '', saving: false }),
  setDrawerNome: (drawerNome) => set({ drawerNome }),
  setSaving: (saving) => set({ saving }),

  upsertLocal: (rca) =>
    set((s) => {
      const exists = s.rcas.some((r) => r.id === rca.id);
      const next = exists ? s.rcas.map((r) => (r.id === rca.id ? rca : r)) : [...s.rcas, rca];
      return { rcas: next.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) };
    }),

  deactivateLocal: (id) =>
    set((s) => ({
      rcas: s.rcas.map((r) => (r.id === id ? { ...r, ativo: false } : r))
    }))
}));
