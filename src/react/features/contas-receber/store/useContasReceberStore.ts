import { create } from 'zustand';

export type CrTab = 'pendentes' | 'vencidos' | 'recebidos';

export type ContasReceberStoreState = {
  activeTab: CrTab;
  searchQuery: string;
};

export type ContasReceberStoreActions = {
  setActiveTab: (_tab: CrTab) => void;
  setSearchQuery: (_q: string) => void;
};

export const useContasReceberStore = create<ContasReceberStoreState & ContasReceberStoreActions>(
  (set) => ({
    activeTab: 'pendentes',
    searchQuery: '',

    setActiveTab: (activeTab) => set({ activeTab, searchQuery: '' }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
  })
);
