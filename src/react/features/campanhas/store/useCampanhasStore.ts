import { create } from 'zustand';
import type { Campanha, CampanhaEnvio } from '../../../../types/domain';

type CampanhaModal = { open: false } | { open: true; item: Campanha | null };
type DetModal = { open: false } | { open: true; campanha: Campanha };
type WaPreviewModal =
  | { open: false }
  | { open: true; envio: CampanhaEnvio; campanha: Campanha | null };

type LoteState = {
  active: boolean;
  ids: string[];
  index: number;
};

type CampanhasState = {
  campModal: CampanhaModal;
  detModal: DetModal;
  waModal: WaPreviewModal;
  lote: LoteState;
};

type CampanhasActions = {
  openCampModal: (item?: Campanha | null) => void;
  closeCampModal: () => void;
  openDetModal: (campanha: Campanha) => void;
  closeDetModal: () => void;
  openWaModal: (envio: CampanhaEnvio, campanha: Campanha | null) => void;
  closeWaModal: () => void;
  startLote: (ids: string[], envios: CampanhaEnvio[], campanhas: Campanha[]) => void;
  avancarLote: (envios: CampanhaEnvio[], campanhas: Campanha[]) => void;
  cancelarLote: () => void;
};

export const useCampanhasStore = create<CampanhasState & CampanhasActions>((set, get) => ({
  campModal: { open: false },
  detModal: { open: false },
  waModal: { open: false },
  lote: { active: false, ids: [], index: 0 },

  openCampModal: (item = null) => set({ campModal: { open: true, item: item ?? null } }),
  closeCampModal: () => set({ campModal: { open: false } }),
  openDetModal: (campanha) => set({ detModal: { open: true, campanha } }),
  closeDetModal: () => set({ detModal: { open: false } }),
  openWaModal: (envio, campanha) => set({ waModal: { open: true, envio, campanha } }),
  closeWaModal: () => set({ waModal: { open: false } }),

  startLote: (ids, envios, campanhas) => {
    if (!ids.length) return;
    set({ lote: { active: true, ids, index: 0 } });
    const first = envios.find((e) => e.id === ids[0]);
    if (first) {
      const camp = campanhas.find((c) => c.id === first.campanha_id) ?? null;
      set({ waModal: { open: true, envio: first, campanha: camp } });
    }
  },
  avancarLote: (envios, campanhas) => {
    const { lote } = get();
    const nextIndex = lote.index + 1;
    if (nextIndex >= lote.ids.length) {
      set({ lote: { active: false, ids: [], index: 0 }, waModal: { open: false } });
      return;
    }
    const nextId = lote.ids[nextIndex];
    const nextEnvio = envios.find((e) => e.id === nextId);
    if (!nextEnvio) {
      set({ lote: { active: false, ids: [], index: 0 }, waModal: { open: false } });
      return;
    }
    const camp = campanhas.find((c) => c.id === nextEnvio.campanha_id) ?? null;
    set({
      lote: { ...lote, index: nextIndex },
      waModal: { open: true, envio: nextEnvio, campanha: camp }
    });
  },
  cancelarLote: () =>
    set({ lote: { active: false, ids: [], index: 0 }, waModal: { open: false } })
}));
