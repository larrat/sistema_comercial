import { create } from 'zustand';
import type { Filial } from '../../../../../types/domain';

const DEFAULT_COR = '#163F80';

export type FilialFormState = {
  nome: string;
  cidade: string;
  estado: string;
  endereco: string;
  cor: string;
};

export type FiliaisStoreState = {
  filiais: Filial[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  reloadKey: number;
  modalOpen: boolean;
  modalEditId: string | null;
  form: FilialFormState;
  saving: boolean;
};

export type FiliaisStoreActions = {
  setFiliais: (_filiais: Filial[]) => void;
  setStatus: (_status: FiliaisStoreState['status'], _error?: string) => void;
  reload: () => void;
  openNew: () => void;
  openEdit: (_filial: Filial) => void;
  closeModal: () => void;
  setForm: (_patch: Partial<FilialFormState>) => void;
  setSaving: (_v: boolean) => void;
  upsertLocal: (_filial: Filial) => void;
  removeLocal: (_id: string) => void;
};

const emptyForm = (): FilialFormState => ({
  nome: '',
  cidade: '',
  estado: '',
  endereco: '',
  cor: DEFAULT_COR
});

export const useFiliaisStore = create<FiliaisStoreState & FiliaisStoreActions>((set) => ({
  filiais: [],
  status: 'idle',
  error: null,
  reloadKey: 0,
  modalOpen: false,
  modalEditId: null,
  form: emptyForm(),
  saving: false,

  setFiliais: (filiais) => set({ filiais, status: 'ready', error: null }),
  setStatus: (status, error) => set({ status, error: error ?? null }),
  reload: () => set((s) => ({ reloadKey: s.reloadKey + 1 })),

  openNew: () =>
    set({
      modalOpen: true,
      modalEditId: null,
      form: emptyForm()
    }),

  openEdit: (filial) =>
    set({
      modalOpen: true,
      modalEditId: filial.id,
      form: {
        nome: filial.nome,
        cidade: filial.cidade ?? '',
        estado: filial.estado ?? '',
        endereco: filial.endereco ?? '',
        cor: filial.cor ?? DEFAULT_COR
      }
    }),

  closeModal: () => set({ modalOpen: false, saving: false }),
  setForm: (patch) => set((s) => ({ form: { ...s.form, ...patch } })),
  setSaving: (saving) => set({ saving }),

  upsertLocal: (filial) =>
    set((s) => ({
      filiais: s.filiais.some((f) => f.id === filial.id)
        ? s.filiais.map((f) => (f.id === filial.id ? filial : f))
        : [...s.filiais, filial]
    })),

  removeLocal: (id) => set((s) => ({ filiais: s.filiais.filter((f) => f.id !== id) }))
}));
