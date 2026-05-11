/**
 * Store para navegação inter-módulos.
 * Substitui os eventos legados sc:abrir-mov-produto e sc:abrir-novo-produto.
 */

import { create } from 'zustand';

type InterModuleNavigationState = {
  /** ID do produto para abrir movimentação, ou null. */
  abrirMovProdutoId: string | null;
  /** Flag para abrir formulário de novo produto. */
  abrirNovoProduto: boolean;
};

type InterModuleNavigationActions = {
  navegarParaMovProduto: (id: string) => void;
  clearMovProduto: () => void;
  navegarParaNovoProduto: () => void;
  clearNovoProduto: () => void;
};

export const useInterModuleStore = create<InterModuleNavigationState & InterModuleNavigationActions>(
  (set) => ({
    abrirMovProdutoId: null,
    abrirNovoProduto: false,

    navegarParaMovProduto: (id) => set({ abrirMovProdutoId: id }),
    clearMovProduto: () => set({ abrirMovProdutoId: null }),

    navegarParaNovoProduto: () => set({ abrirNovoProduto: true }),
    clearNovoProduto: () => set({ abrirNovoProduto: false })
  })
);
