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
  campanhas: Campanha[];
  envios: CampanhaEnvio[];
  loading: boolean;
  error: string | null;
  reloadKey: number;
  campModal: CampanhaModal;
  detModal: DetModal;
  waModal: WaPreviewModal;
  lote: LoteState;
  saving: boolean;
};

type CampanhasActions = {
  setCampanhas: (v: Campanha[]) => void;
  setEnvios: (v: CampanhaEnvio[]) => void;
  patchEnvioLocal: (id: string, patch: Partial<CampanhaEnvio>) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  requestReload: () => void;
  setSaving: (v: boolean) => void;
  openCampModal: (item?: Campanha | null) => void;
  closeCampModal: () => void;
  openDetModal: (campanha: Campanha) => void;
  closeDetModal: () => void;
  openWaModal: (envio: CampanhaEnvio, campanha: Campanha | null) => void;
  closeWaModal: () => void;
  startLote: (ids: string[]) => void;
  avancarLote: () => void;
  cancelarLote: () => void;
};

export const useCampanhasStore = create<CampanhasState & CampanhasActions>((set, get) => ({
  campanhas: [],
  envios: [],
  loading: false,
  error: null,
  reloadKey: 0,
  campModal: { open: false },
  detModal: { open: false },
  waModal: { open: false },
  lote: { active: false, ids: [], index: 0 },
  saving: false,

  setCampanhas: (campanhas) => set({ campanhas }),
  setEnvios: (envios) => set({ envios }),
  patchEnvioLocal: (id, patch) =>
    set((s) => ({
      envios: s.envios.map((e) => (e.id === id ? { ...e, ...patch } : e))
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  requestReload: () => set((s) => ({ reloadKey: s.reloadKey + 1 })),
  setSaving: (saving) => set({ saving }),

  openCampModal: (item = null) => set({ campModal: { open: true, item: item ?? null } }),
  closeCampModal: () => set({ campModal: { open: false } }),
  openDetModal: (campanha) => set({ detModal: { open: true, campanha } }),
  closeDetModal: () => set({ detModal: { open: false } }),
  openWaModal: (envio, campanha) => set({ waModal: { open: true, envio, campanha } }),
  closeWaModal: () => set({ waModal: { open: false } }),

  startLote: (ids) => {
    if (!ids.length) return;
    set({ lote: { active: true, ids, index: 0 } });
    const envios = get().envios;
    const first = envios.find((e) => e.id === ids[0]);
    if (first) {
      const camp = get().campanhas.find((c) => c.id === first.campanha_id) ?? null;
      set({ waModal: { open: true, envio: first, campanha: camp } });
    }
  },
  avancarLote: () => {
    const { lote, envios, campanhas } = get();
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
