import { create } from 'zustand';
import type { Filial } from '../../../../types/domain';

const DEFAULT_COR = '#163F80';

export type FilialFormState = {
  nome: string;
  cidade: string;
  estado: string;
  endereco: string;
  cor: string;
  meta_mensal: string;
  is_fiscal: boolean;
};

export type FiliaisStoreState = {
  modalOpen: boolean;
  modalEditId: string | null;
  form: FilialFormState;
  saving: boolean;
};

export type FiliaisStoreActions = {
  openNew: () => void;
  openEdit: (_filial: Filial) => void;
  closeModal: () => void;
  setForm: (_patch: Partial<FilialFormState>) => void;
  setSaving: (_v: boolean) => void;
};

const emptyForm = (): FilialFormState => ({
  nome: '',
  cidade: '',
  estado: '',
  endereco: '',
  cor: DEFAULT_COR,
  meta_mensal: '',
  is_fiscal: false
});

export const useFiliaisStore = create<FiliaisStoreState & FiliaisStoreActions>((set) => ({
  modalOpen: false,
  modalEditId: null,
  form: emptyForm(),
  saving: false,

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
        cor: filial.cor ?? DEFAULT_COR,
        meta_mensal: filial.meta_mensal ? String(filial.meta_mensal) : '',
        is_fiscal: !!filial.is_fiscal
      }
    }),

  closeModal: () => set({ modalOpen: false, saving: false }),
  setForm: (patch) => set((s) => ({ form: { ...s.form, ...patch } })),
  setSaving: (saving) => set({ saving }),
}));
