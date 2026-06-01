import { create } from 'zustand';
import { db, type OfflinePedido } from '../pdv/db';
import { savePedido } from '../services/pedidosApi';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { toast } from 'sonner';

type PdvSyncStoreState = {
  isOnline: boolean;
  isSyncing: boolean;
  pendingPedidos: OfflinePedido[];
  syncHistory: OfflinePedido[];
};

type PdvSyncStoreActions = {
  setOnline: (online: boolean) => void;
  loadFromDb: () => Promise<void>;
  enqueuePedido: (pedido: Omit<OfflinePedido, 'sync_status' | 'criado_em'>) => Promise<void>;
  processQueue: () => Promise<void>;
  clearHistory: () => Promise<void>;
};

export const usePdvSyncStore = create<PdvSyncStoreState & PdvSyncStoreActions>((set, get) => {
  // Listen to browser online/offline events
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      set({ isOnline: true });
      void get().processQueue();
    });
    window.addEventListener('offline', () => {
      set({ isOnline: false });
    });
  }

  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingPedidos: [],
    syncHistory: [],

    setOnline: (online) => {
      set({ isOnline: online });
      if (online) {
        void get().processQueue();
      }
    },

    loadFromDb: async () => {
      const allPedidos = await db.pedidos.toArray();
      
      const pending = allPedidos
        .filter((p) => p.sync_status === 'pending')
        .sort((a, b) => a.criado_em.localeCompare(b.criado_em)); // FIFO order
        
      const history = allPedidos
        .filter((p) => p.sync_status !== 'pending')
        .sort((a, b) => b.criado_em.localeCompare(a.criado_em)); // Recent first

      set({ pendingPedidos: pending, syncHistory: history });
    },

    enqueuePedido: async (pedidoData) => {
      const newPedido: OfflinePedido = {
        ...pedidoData,
        sync_status: 'pending',
        criado_em: new Date().toISOString()
      };

      await db.pedidos.put(newPedido);
      await get().loadFromDb();

      toast.info('Venda registrada offline e salva no banco local.');

      // Tenta sincronizar imediatamente se estiver online
      if (get().isOnline) {
        void get().processQueue();
      }
    },

    processQueue: async () => {
      const state = get();
      if (!state.isOnline || state.isSyncing || state.pendingPedidos.length === 0) {
        return;
      }

      set({ isSyncing: true });

      try {
        const session = useAuthStore.getState().session;
        const config = getSupabaseConfig();
        const activeFilialId = useFilialStore.getState().filialId;

        if (!session || !config.ready || !activeFilialId) {
          console.warn('[pdv-sync] Credenciais ou filial ativa ausentes. Aguardando autenticação.');
          set({ isSyncing: false });
          return;
        }

        const apiContext = {
          url: config.url,
          key: config.key,
          token: session.access_token,
          filialId: activeFilialId
        };

        const pending = [...state.pendingPedidos];

        for (const pedido of pending) {
          try {
            // Mapeia para o input de gravação do backend
            const inputPayload = {
              id: pedido.id,
              filial_id: pedido.filial_id,
              num: pedido.num,
              cli: pedido.cli,
              cliente_id: pedido.cliente_id,
              rca_id: pedido.rca_id,
              rca_nome: pedido.rca_nome,
              data: pedido.data,
              status: pedido.status,
              pgto: pedido.pgto,
              prazo: pedido.prazo,
              tipo: pedido.tipo,
              obs: pedido.obs,
              itens: pedido.itens,
              total: pedido.total,
              origem_venda: 'pdv'
            };

            await savePedido(apiContext, inputPayload);

            // Atualiza status local para sincronizado
            await db.pedidos.update(pedido.id, {
              sync_status: 'synced',
              sync_error: null
            });

            toast.success(`Pedido #${pedido.num} sincronizado com a nuvem.`);
          } catch (err) {
            console.error(`[pdv-sync] Falha ao sincronizar pedido #${pedido.num}:`, err);
            
            // Atualiza status local para falha
            await db.pedidos.update(pedido.id, {
              sync_status: 'failed',
              sync_error: err instanceof Error ? err.message : 'Erro desconhecido'
            });
            
            toast.error(`Falha ao sincronizar pedido #${pedido.num}.`);
          }
        }
      } finally {
        await get().loadFromDb();
        set({ isSyncing: false });
      }
    },

    clearHistory: async () => {
      const historyIds = get().syncHistory.map((p) => p.id);
      if (historyIds.length > 0) {
        await db.pedidos.bulkDelete(historyIds);
        await get().loadFromDb();
        toast.success('Histórico de sincronização local limpo.');
      }
    }
  };
});
