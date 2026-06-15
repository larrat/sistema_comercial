import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { usePdvStore } from '../store/usePdvStore';
import { usePedidoMutations } from './usePedidosQuery';
import { getNextPedidoNumber, updateValeTrocaStatus } from '../services/pedidosApi';
import { countPdvQueue, listPdvQueue, enqueuePdvSale, removePdvSaleFromQueue } from '../pdv/pdvQueue';
import {
  calculateCartTotals,
  validateMixedPayments,
  buildPedidoItensFromCart,
  mapPdvPaymentToPedido,
  normalizePrazoCliente
} from '../pdv/pdvCart';
import type { PdvQueuedSale, PdvPaymentMethod } from '../pdv/pdvCart';
import type { ClienteLight } from '../../clientes/services/clientesApi';

export type CompletedSale = {
  numero: number;
  total: number;
  itemCount: number;
  paymentMethod: string;
  cliente: ClienteLight | null;
  createdAt: string;
  isContingency?: boolean;
  qrCodeUrl?: string;
};

export const PAYMENT_OPTIONS: Array<{
  value: PdvPaymentMethod;
  label: string;
  emoji: string;
  disabledWithoutCliente?: boolean;
}> = [
  { value: 'dinheiro', label: 'Dinheiro', emoji: '💵' },
  { value: 'pix', label: 'Pix', emoji: '⚡' },
  { value: 'credito', label: 'Crédito', emoji: '💳' },
  { value: 'debito', label: 'Débito', emoji: '🏧' },
  { value: 'fiado', label: 'Fiado', emoji: '🧾', disabledWithoutCliente: true },
  { value: 'misto', label: 'Misto', emoji: '🧩' }
];

export function formatDateTime(now: Date): string {
  return now.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

export function createSaleToken(): string {
  return `PDV-${Date.now().toString().slice(-6)}`;
}

export function getUserIdentifier(session: any): string | null {
  const user = session?.user;
  if (!user || typeof user !== 'object') return null;
  if ('email' in user && typeof user.email === 'string' && user.email.trim()) return user.email;
  if ('id' in user && typeof user.id === 'string' && user.id.trim()) return user.id;
  return null;
}

function isOfflineLikeError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    !navigator.onLine ||
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('timeout') ||
    normalized.includes('fetch')
  );
}

function isPdvMetadataMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('origem_venda') ||
    normalized.includes('pgto_meta') ||
    normalized.includes('schema cache') ||
    normalized.includes('column')
  );
}

export function usePdvEngine() {
  const session = useAuthStore((state) => state.session);
  const filialId = useFilialStore((state) => state.filialId);
  
  const {
    items, selectedCliente, paymentMethod, mixedPayments,
    discountValue, clearSale,
    setProductQuery, setProductResults, setProductSearchError, setActiveSuggestionIndex,
    setClienteQuery, setClienteResults, setClienteSearchError,
    setSaleToken, setDiscountDraft, setAppliedVale, setValeCodigoInput
  } = usePdvStore((state: any) => ({ ...state })); // Mapeia ações e estado
  
  // Como usamos o store para limpeza, trazemos os setter do store diretamente do componente pai ou os recriamos.
  // Para evitar acoplamento forte com os inputs do componente, delegamos "resetCurrentSale" parcial aqui:
  const resetPdvStore = usePdvStore((state) => state.clearSale);

  const { save } = usePedidoMutations();
  
  const [nextPedidoNum, setNextPedidoNum] = useState(1);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  
  const [lastCompletedSale, setLastCompletedSale] = useState<CompletedSale | null>(null);

  const queueProcessingRef = useRef(false);

  function resolveContext() {
    if (!session?.access_token || !filialId) return null;
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) return null;
    return { url, key, token: session.access_token, filialId };
  }

  async function loadNextPedidoNumber() {
    const context = resolveContext();
    if (!context) {
      setPageError('Sessão, filial ou configuração do Supabase ausente.');
      setInitialLoading(false);
      return;
    }
    try {
      setInitialLoading(true);
      setPageError(null);
      const next = await getNextPedidoNumber(context);
      setNextPedidoNum(next);
      setPendingQueueCount(countPdvQueue(context.filialId));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Não foi possível preparar o PDV.');
    } finally {
      setInitialLoading(false);
    }
  }

  async function processQueue() {
    const context = resolveContext();
    if (!context || queueProcessingRef.current) return;
    const queue = listPdvQueue(context.filialId);
    if (!queue.length) {
      setPendingQueueCount(0);
      return;
    }

    queueProcessingRef.current = true;
    try {
      const current = queue[0];
      await submitPdvPayload(current.payload, { silent: true });
      removePdvSaleFromQueue(context.filialId, current.queueId);
      const remaining = countPdvQueue(context.filialId);
      setPendingQueueCount(remaining);
      toast.success('Venda pendente enviada com sucesso.');
      if (remaining > 0) window.setTimeout(() => void processQueue(), 250);
    } catch {
      setPendingQueueCount(countPdvQueue(context.filialId));
    } finally {
      queueProcessingRef.current = false;
    }
  }

  useEffect(() => {
    void loadNextPedidoNumber();
  }, [session?.access_token, filialId]);

  useEffect(() => {
    const context = resolveContext();
    if (!context) return;
    const tick = () => void processQueue();
    tick();
    const interval = window.setInterval(tick, 12000);
    window.addEventListener('online', tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', tick);
    };
  }, [session?.access_token, filialId]);

  async function submitPdvPayload(
    payload: PdvQueuedSale['payload'],
    options: { silent?: boolean } = {}
  ) {
    try {
      await save.mutateAsync(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar venda.';
      if (!isPdvMetadataMissingError(message)) throw error;

      const { origem_venda, pgto_meta, ...fallback } = payload;
      const fallbackObs = [
        payload.obs,
        pgto_meta ? `[PDV_META] ${JSON.stringify(pgto_meta)}` : '',
        origem_venda ? `[PDV_ORIGEM] ${origem_venda}` : ''
      ].filter(Boolean).join('\n');

      if (!options.silent) {
        toast.warning('Metadados do PDV ainda não existem no banco. Salvando a venda no modo compatível.');
      }
      await save.mutateAsync({ ...fallback, obs: fallbackObs });
    }
  }

  async function handleFinalizeSale(args: {
    items: any[];
    totals: any;
    finalTotal: number;
    mixedValidation: any;
    selectedCliente: ClienteLight | null;
    paymentMethod: PdvPaymentMethod | null;
    appliedVale: any;
    onSuccess: () => void;
    onMixedModalRequired: () => void;
  }) {
    const { items, finalTotal, mixedValidation, selectedCliente, paymentMethod, appliedVale } = args;
    const isSaving = save.isPending;
    
    const canFinalize =
      items.length > 0 &&
      !!paymentMethod &&
      (paymentMethod !== 'fiado' || (!!selectedCliente && !selectedCliente.is_defaulter)) &&
      (paymentMethod !== 'misto' || mixedValidation.isValid) &&
      !isSaving;

    if (!canFinalize) return;

    if (paymentMethod === 'misto' && !mixedValidation.isValid) {
      toast.warning('A soma do pagamento misto precisa bater com o total da venda.');
      args.onMixedModalRequired();
      return;
    }
    if (paymentMethod === 'fiado' && !selectedCliente) {
      toast.warning('Fiado precisa de cliente vinculado.');
      return;
    }

    const paymentLabel = PAYMENT_OPTIONS.find((o) => o.value === paymentMethod)?.label ?? 'Pagamento';
    const payload: PdvQueuedSale['payload'] = {
      id: globalThis.crypto.randomUUID(),
      filial_id: filialId!,
      num: nextPedidoNum,
      cli: selectedCliente?.nome || 'CONSUMIDOR FINAL',
      cliente_id: selectedCliente?.id ?? null,
      rca_id: selectedCliente?.rca_id ?? null,
      rca_nome: selectedCliente?.rca_nome ?? null,
      data: new Date().toISOString().slice(0, 10),
      status: 'entregue',
      pgto: mapPdvPaymentToPedido(paymentMethod!),
      prazo: paymentMethod === 'fiado' ? normalizePrazoCliente(selectedCliente) : 'imediato',
      tipo: 'varejo',
      obs: appliedVale ? `Vale-Troca utilizado: ${appliedVale.codigo} (R$ ${appliedVale.valor})` : '',
      itens: buildPedidoItensFromCart(items, args.totals.discountValue),
      total: finalTotal,
      origem_venda: 'pdv',
      pgto_meta: {
        method: paymentMethod,
        ...(paymentMethod === 'misto' ? { parts: mixedValidation.parts } : {}),
        ...(appliedVale ? { vale_troca_codigo: appliedVale.codigo, vale_troca_valor: appliedVale.valor } : {})
      },
      venda_fechada: true,
      venda_fechada_em: new Date().toISOString(),
      venda_fechada_por: getUserIdentifier(session)
    };

    try {
      await submitPdvPayload(payload);
      
      if (appliedVale) {
        const ctx = resolveContext();
        if (ctx) await updateValeTrocaStatus(ctx, appliedVale.id, 'utilizado');
      }

      const ctx = resolveContext();
      let nfceResult: any = null;
      if (ctx) {
        try {
          const { processNfce } = await import('../pdv/nfceContingencyService');
          nfceResult = await processNfce(payload as any, ctx.token);
          if (nfceResult.isContingency) {
            toast.info('NFC-e gerada em Contingência e salva na fila local.');
          }
        } catch (err) {
          console.error('Erro na NFCe:', err);
        }
      }

      toast.success('Venda finalizada. O PDV já está pronto para a próxima.');
      setLastCompletedSale({
        numero: payload.num,
        total: payload.total,
        itemCount: items.length,
        paymentMethod: paymentLabel,
        cliente: selectedCliente,
        createdAt: formatDateTime(new Date()),
        isContingency: nfceResult?.isContingency,
        qrCodeUrl: nfceResult?.qrCodeUrl
      });
      setNextPedidoNum((c) => c + 1);
      args.onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível finalizar a venda.';
      if (isOfflineLikeError(message) && filialId) {
        enqueuePdvSale(filialId, {
          queueId: globalThis.crypto.randomUUID(),
          payload,
          createdAt: new Date().toISOString()
        });
        setPendingQueueCount(countPdvQueue(filialId));
        toast.warning('Venda guardada na fila local. Vamos reenviar quando a rede voltar.');
        
        let qrCodeUrl;
        try {
          const { processNfce } = await import('../pdv/nfceContingencyService');
          const ctx = resolveContext();
          if (ctx) {
            const nfceResult = await processNfce(payload as any, ctx.token, true);
            qrCodeUrl = nfceResult?.qrCodeUrl;
          }
        } catch (err) {
          console.error(err);
        }

        setLastCompletedSale({
          numero: payload.num,
          total: payload.total,
          itemCount: items.length,
          paymentMethod: paymentLabel,
          cliente: selectedCliente,
          createdAt: formatDateTime(new Date()),
          isContingency: true,
          qrCodeUrl: qrCodeUrl
        });
        setNextPedidoNum((c) => c + 1);
        args.onSuccess();
      } else {
        toast.error(message);
      }
    }
  }

  return {
    initialLoading,
    pageError,
    nextPedidoNum,
    pendingQueueCount,
    lastCompletedSale,
    isSaving: save.isPending,
    loadNextPedidoNumber,
    handleFinalizeSale
  };
}
