/**
 * Store de filial ativa React — sincroniza com o legado.
 *
 * O legado persiste a filial escolhida em localStorage (sc_filial_id).
 * Este store lê e escreve na mesma chave para manter coerência.
 */

import { create } from 'zustand';

const FILIAL_STORAGE_KEY = 'sc_filial_id';

function readFilialId(): string | null {
  return localStorage.getItem(FILIAL_STORAGE_KEY) || null;
}

export type FilialStoreState = {
  filialId: string | null;
};

export type FilialStoreActions = {
  hydrate: () => void;
  setFilial: (filialId: string) => void;
  clearFilial: () => void;
};

export const useFilialStore = create<FilialStoreState & FilialStoreActions>((set) => ({
  filialId: null,

  hydrate: () => {
    set({ filialId: readFilialId() });
  },

  setFilial: (filialId) => {
    localStorage.setItem(FILIAL_STORAGE_KEY, filialId);
    set({ filialId });
  },

  clearFilial: () => {
    localStorage.removeItem(FILIAL_STORAGE_KEY);
    set({ filialId: null });
  }
}));
