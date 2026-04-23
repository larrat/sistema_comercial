import { create } from 'zustand';
import type { Rca } from '../../../../types/domain';

type RcasState = {
  rcas: Rca[];
  loading: boolean;
  error: string | null;
  reloadKey: number;

  modalOpen: boolean;
  modalEditId: string | null;
  modalNome: string;
  saving: boolean;
};

type RcasActions = {
  setRcas: (rcas: Rca[]) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  requestReload: () => void;

  openModal: (rca?: Rca) => void;
  closeModal: () => void;
  setModalNome: (nome: string) => void;
  setSaving: (v: boolean) => void;
  upsertLocal: (rca: Rca) => void;
  deactivateLocal: (id: string) => void;
};

export const useRcasStore = create<RcasState & RcasActions>((set) => ({
  rcas: [],
  loading: false,
  error: null,
  reloadKey: 0,

  modalOpen: false,
  modalEditId: null,
  modalNome: '',
  saving: false,

  setRcas: (rcas) => set({ rcas }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  requestReload: () => set((s) => ({ reloadKey: s.reloadKey + 1 })),

  openModal: (rca) =>
    set({
      modalOpen: true,
      modalEditId: rca?.id ?? null,
      modalNome: rca?.nome ?? ''
    }),
  closeModal: () => set({ modalOpen: false, modalEditId: null, modalNome: '', saving: false }),
  setModalNome: (modalNome) => set({ modalNome }),
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
