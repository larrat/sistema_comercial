import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { useRoleStore } from '../../../app/useRoleStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useKeyboardShortcuts } from '../../../shared/hooks/useKeyboardShortcuts';
import { EmptyState, ErrorState, Modal, StatusBadge, Button, Input, ScannerModal } from '../../../shared/ui';
import { Camera, Ticket, DollarSign } from 'lucide-react';
import { usePedidoMutations } from '../hooks/usePedidosQuery';
import { getNextPedidoNumber, getValeTroca, updateValeTrocaStatus } from '../services/pedidosApi';
import {
  searchClientesLight,
  type ClienteLight
} from '../services/clientesLightApi';
import {
  searchProdutosPdv,
  type PdvProdutoSearchResult
} from '../services/produtosApi';
import {
  buildPedidoItensFromCart,
  calculateCartTotals,
  createCartItemFromProduto,
  formatCurrencyBRL,
  formatQty,
  mapPdvPaymentToPedido,
  normalizePrazoCliente,
  parseDecimalInput,
  roundCurrency,
  type PdvPaymentMethod,
  type PdvQueuedSale,
  validateMixedPayments
} from '../pdv/pdvCart';
import { useQuery } from '@tanstack/react-query';
import {
  countPdvQueue,
  enqueuePdvSale,
  listPdvQueue,
  removePdvSaleFromQueue
} from '../pdv/pdvQueue';
import { usePdvStore } from '../store/usePdvStore';
import { PdvClienteModal } from './PdvClienteModal';
import { PdvComprovanteModal } from './PdvComprovanteModal';
import { PdvPagamentoMistoModal } from './PdvPagamentoMistoModal';
import { PdvSearchDrawer } from './PdvSearchDrawer';
import { PdvLeftPanelHeader } from './PdvLeftPanelHeader';
import { PdvCartGrid } from './PdvCartGrid';
import { PdvCartItems } from './PdvCartItems';
import { PdvCartSummary } from './PdvCartSummary';
import { toast } from 'sonner';

const PAYMENT_OPTIONS: Array<{
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

type PedidoApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
};

function formatDateTime(now: Date): string {
  return now.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function createSaleToken(): string {
  return `PDV-${Date.now().toString().slice(-6)}`;
}

function getUserIdentifier(session: ReturnType<typeof useAuthStore.getState>['session']): string | null {
  const user = session?.user;
  if (!user || typeof user !== 'object') return null;
  if ('email' in user && typeof user.email === 'string' && user.email.trim()) return user.email;
  if ('id' in user && typeof user.id === 'string' && user.id.trim()) return user.id;
  return null;
}

function getClienteWhatsappLink(cliente: ClienteLight | null): string | null {
  const raw = String(cliente?.whatsapp || cliente?.tel || '').replace(/\D/g, '');
  return raw ? `https://wa.me/${raw}` : null;
}

function buildReceiptMessage(args: {
  numero: number;
  cliente: ClienteLight | null;
  total: number;
  itemCount: number;
  paymentMethod: string;
}): string {
  const lines = [
    `Venda #${args.numero}`,
    args.cliente?.nome ? `Cliente: ${args.cliente.nome}` : 'Cliente: Consumidor final',
    `Itens: ${args.itemCount}`,
    `Pagamento: ${args.paymentMethod}`,
    `Total: ${formatCurrencyBRL(args.total)}`
  ];
  return lines.join('\n');
}

function buildReceiptHtml(args: {
  numero: number;
  createdAt: string;
  cliente: ClienteLight | null;
  total: number;
  itemCount: number;
  paymentMethod: string;
  isContingency?: boolean;
  qrCodeUrl?: string;
}): string {
  return `
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Comprovante PDV</title>
        <style>
          body { font-family: sans-serif; padding: 16px; color: #111827; }
          h1 { font-size: 18px; margin-bottom: 12px; text-align: center; }
          .contingency-badge { border: 2px dashed #000; padding: 8px; font-weight: bold; text-align: center; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; }
          p { margin: 0 0 8px; font-size: 13px; }
          .qr-code { text-align: center; margin-top: 16px; font-size: 11px; word-break: break-all; }
        </style>
      </head>
      <body>
        <h1>Comprovante da venda</h1>
        ${args.isContingency ? '<div class="contingency-badge">Emitida em Contingência<br/><small>Pendente de autorização</small></div>' : ''}
        <p>Venda #${args.numero}</p>
        <p>Data: ${args.createdAt}</p>
        <p>Cliente: ${args.cliente?.nome || 'Consumidor final'}</p>
        <p>Itens: ${args.itemCount}</p>
        <p>Pagamento: ${args.paymentMethod}</p>
        <p>Total: ${formatCurrencyBRL(args.total)}</p>
        ${args.qrCodeUrl ? `<div class="qr-code"><p>Consulta QR Code:</p><p>${args.qrCodeUrl}</p></div>` : ''}
      </body>
    </html>
  `;
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

export function PdvPage() {
  const items = usePdvStore((state) => state.items);
  const selectedCliente = usePdvStore((state) => state.selectedCliente);
  const paymentMethod = usePdvStore((state) => state.paymentMethod);
  const mixedPayments = usePdvStore((state) => state.mixedPayments);
  const discountValue = usePdvStore((state) => state.discountValue);
  const focusedItemKey = usePdvStore((state) => state.focusedItemKey);
  const addItem = usePdvStore((state) => state.addItem);
  const incrementItem = usePdvStore((state) => state.incrementItem);
  const decrementItem = usePdvStore((state) => state.decrementItem);
  const setItemQty = usePdvStore((state) => state.setItemQty);
  const removeItem = usePdvStore((state) => state.removeItem);
  const clearSale = usePdvStore((state) => state.clearSale);
  const setSelectedCliente = usePdvStore((state) => state.setSelectedCliente);
  const setPaymentMethod = usePdvStore((state) => state.setPaymentMethod);
  const setMixedPayments = usePdvStore((state) => state.setMixedPayments);
  const setDiscountValue = usePdvStore((state) => state.setDiscountValue);
  const setFocusedItemKey = usePdvStore((state) => state.setFocusedItemKey);

  const session = useAuthStore((state) => state.session);
  const filialId = useFilialStore((state) => state.filialId);
  const hasPermission = useRoleStore((state) => state.hasPermission);
  const { save } = usePedidoMutations();

  const [saleToken, setSaleToken] = useState(() => createSaleToken());
  const [now, setNow] = useState(() => new Date());
  const [nextPedidoNum, setNextPedidoNum] = useState(1);
  const [pageError, setPageError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<PdvProdutoSearchResult[]>([]);
  const [productSearchError, setProductSearchError] = useState<string | null>(null);
  const [productSearching, setProductSearching] = useState(false);
  const [productSearchMs, setProductSearchMs] = useState<number | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteResults, setClienteResults] = useState<ClienteLight[]>([]);
  const [clienteSearchError, setClienteSearchError] = useState<string | null>(null);
  const [clienteSearching, setClienteSearching] = useState(false);
  const [mixedModalOpen, setMixedModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [valeCodigoInput, setValeCodigoInput] = useState('');
  const [appliedVale, setAppliedVale] = useState<{ id: string; codigo: string; valor: number } | null>(null);
  const [isValeLoading, setIsValeLoading] = useState(false);
  const [discountDraft, setDiscountDraft] = useState(() => discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptCountdown, setReceiptCountdown] = useState(5);
  const [lastCompletedSale, setLastCompletedSale] = useState<{
    numero: number;
    total: number;
    itemCount: number;
    paymentMethod: string;
    cliente: ClienteLight | null;
    createdAt: string;
    isContingency?: boolean;
    qrCodeUrl?: string;
  } | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showScannerHalo, setShowScannerHalo] = useState(false);

  // E2E Re-structuring States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerQuery, setDrawerQuery] = useState('');
  const [drawerResults, setDrawerResults] = useState<PdvProdutoSearchResult[]>([]);
  const [drawerSearching, setDrawerSearching] = useState(false);
  const [selectedDrawerProduto, setSelectedDrawerProduto] = useState<PdvProdutoSearchResult | null>(null);
  const [pdvViewMode, setPdvViewMode] = useState<'list' | 'grid'>('list');
  const [catalogProducts, setCatalogProducts] = useState<PdvProdutoSearchResult[]>([]);

  const productInputRef = useRef<HTMLInputElement>(null);
  const productSearchRequestRef = useRef(0);
  const clienteSearchRequestRef = useRef(0);
  const queueProcessingRef = useRef(false);

  const totals = useMemo(() => calculateCartTotals(items, discountValue), [items, discountValue]);

  const finalTotal = useMemo(() => {
    return Math.max(0, totals.total - (appliedVale ? appliedVale.valor : 0));
  }, [totals.total, appliedVale]);

  const mixedValidation = useMemo(
    () => validateMixedPayments(mixedPayments, finalTotal),
    [mixedPayments, finalTotal]
  );
  const saving = save.isPending;
  const canFinalize =
    items.length > 0 &&
    !!paymentMethod &&
    (paymentMethod !== 'fiado' || (!!selectedCliente && !selectedCliente.is_defaulter)) &&
    (paymentMethod !== 'misto' || mixedValidation.isValid) &&
    !saving;

  function resolveContext(): PedidoApiContext | null {
    if (!session?.access_token || !filialId) return null;
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) return null;
    return { url, key, token: session.access_token, filialId };
  }

  function resetCurrentSale() {
    clearSale();
    setProductQuery('');
    setProductResults([]);
    setProductSearchError(null);
    setProductSearchMs(null);
    setActiveSuggestionIndex(0);
    setClienteQuery('');
    setClienteResults([]);
    setClienteSearchError(null);
    setSaleToken(createSaleToken());
    setDiscountDraft('0,00');
    setAppliedVale(null);
    setValeCodigoInput('');
    setNextPedidoNum((current) => current + 1);
    window.requestAnimationFrame(() => productInputRef.current?.focus());
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

  useEffect(() => {
    void loadNextPedidoNumber();
  }, [session?.access_token, filialId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const query = productQuery.trim();
    const context = resolveContext();
    if (!query) {
      setProductResults([]);
      setProductSearchError(null);
      setProductSearching(false);
      setProductSearchMs(null);
      setActiveSuggestionIndex(0);
      return;
    }
    if (!context) return;

    const requestId = ++productSearchRequestRef.current;
    const timer = window.setTimeout(() => {
      const startedAt = performance.now();
      setProductSearching(true);
      setProductSearchError(null);
      searchProdutosPdv(context, query, 8)
        .then((results) => {
          if (requestId !== productSearchRequestRef.current) return;
          const inStockResults = results.filter((p) => Number(p.esal) > 0);
          setProductResults(inStockResults);
          setActiveSuggestionIndex(0);
          setProductSearchMs(Math.round(performance.now() - startedAt));
        })
        .catch((error) => {
          if (requestId !== productSearchRequestRef.current) return;
          setProductSearchError(error instanceof Error ? error.message : 'Erro ao buscar produto.');
          setProductResults([]);
          setProductSearchMs(null);
        })
        .finally(() => {
          if (requestId === productSearchRequestRef.current) setProductSearching(false);
        });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [productQuery, session?.access_token, filialId]);

  useEffect(() => {
    const context = resolveContext();
    const query = clienteQuery.trim();
    if (!clienteModalOpen) return;
    if (!query) {
      setClienteResults([]);
      setClienteSearchError(null);
      setClienteSearching(false);
      return;
    }
    if (!context) return;

    const requestId = ++clienteSearchRequestRef.current;
    const timer = window.setTimeout(() => {
      setClienteSearching(true);
      setClienteSearchError(null);
      searchClientesLight(context, query, 8)
        .then((results) => {
          if (requestId !== clienteSearchRequestRef.current) return;
          setClienteResults(results);
        })
        .catch((error) => {
          if (requestId !== clienteSearchRequestRef.current) return;
          setClienteSearchError(error instanceof Error ? error.message : 'Erro ao buscar clientes.');
          setClienteResults([]);
        })
        .finally(() => {
          if (requestId === clienteSearchRequestRef.current) setClienteSearching(false);
        });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [clienteModalOpen, clienteQuery, session?.access_token, filialId]);

  useEffect(() => {
    if (!receiptOpen) return;
    setReceiptCountdown(5);
    const timer = window.setInterval(() => {
      setReceiptCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setReceiptOpen(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [receiptOpen]);

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

  function handleSelectProduto(produto: PdvProdutoSearchResult) {
    if (Number(produto.esal) <= 0 && !hasPermission('estoque:override')) {
      toast.error(`Produto "${produto.nome}" está sem saldo no estoque.`);
      return;
    }
    addItem(createCartItemFromProduto(produto));
    setProductQuery('');
    setProductResults([]);
    setProductSearchError(null);
    setActiveSuggestionIndex(0);
    setShowScannerHalo(true);
    setTimeout(() => setShowScannerHalo(false), 800);
    window.requestAnimationFrame(() => productInputRef.current?.focus());
  }

  async function handleScanResult(code: string) {
    const context = resolveContext();
    if (!context) return;
    
    setProductSearching(true);
    try {
      // Buscar especificamente por SKU ou Código de Barras
      const results = await searchProdutosPdv(context, code, 1);
      if (results.length > 0) {
        handleSelectProduto(results[0]);
        toast.success(`Produto adicionado: ${results[0].nome}`);
      } else {
        toast.error(`Produto não encontrado com o código: ${code}`);
      }
    } catch (err) {
      toast.error('Erro ao processar leitura.');
    } finally {
      setProductSearching(false);
    }
  }

  function handleApplyDiscount() {
    const nextDiscount = Math.max(0, Math.min(parseDecimalInput(discountDraft), totals.subtotal));
    setDiscountValue(nextDiscount);
    setDiscountDraft(
      nextDiscount.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
    setDiscountModalOpen(false);
  }

  async function submitPdvPayload(
    payload: PdvQueuedSale['payload'],
    options: { silent?: boolean } = {}
  ) {
    try {
      // Usamos mutateAsync para poder capturar o erro aqui e tratar o fallback
      await save.mutateAsync(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar venda.';
      if (!isPdvMetadataMissingError(message)) throw error;

      const { origem_venda, pgto_meta, ...fallback } = payload;
      const fallbackObs = [
        payload.obs,
        pgto_meta ? `[PDV_META] ${JSON.stringify(pgto_meta)}` : '',
        origem_venda ? `[PDV_ORIGEM] ${origem_venda}` : ''
      ]
        .filter(Boolean)
        .join('\n');

      if (!options.silent) {
        toast.warning('Metadados do PDV ainda não existem no banco. Salvando a venda no modo compatível.');
      }

      await save.mutateAsync({
        ...fallback,
        obs: fallbackObs
      });
    }
  }

  async function handleFinalizeSale() {
    if (!canFinalize) return;
    if (paymentMethod === 'misto' && !mixedValidation.isValid) {
      toast.warning('A soma do pagamento misto precisa bater com o total da venda.');
      setMixedModalOpen(true);
      return;
    }
    if (paymentMethod === 'fiado' && !selectedCliente) {
      toast.warning('Fiado precisa de cliente vinculado.');
      return;
    }

    const paymentLabel = PAYMENT_OPTIONS.find((option) => option.value === paymentMethod)?.label ?? 'Pagamento';
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
      itens: buildPedidoItensFromCart(items, totals.discountValue),
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
      
      // Consume the vale-troca coupon in database if applied
      if (appliedVale) {
        const ctx = resolveContext();
        if (ctx) {
          await updateValeTrocaStatus(ctx, appliedVale.id, 'utilizado');
        }
      }

      // Generate NFC-e automatically on successful local sale
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
      setReceiptOpen(true);
      resetCurrentSale();
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
            const nfceResult = await processNfce(payload as any, ctx.token, true); // Force contingency
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
        setReceiptOpen(true);
        resetCurrentSale();
      } else {
        toast.error(message);
      }
    }
  }

  function handlePrintReceipt() {
    if (!lastCompletedSale) return;
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=360,height=520');
    if (!popup) return;
    popup.document.write(
      buildReceiptHtml({
        numero: lastCompletedSale.numero,
        createdAt: lastCompletedSale.createdAt,
        cliente: lastCompletedSale.cliente,
        total: lastCompletedSale.total,
        itemCount: lastCompletedSale.itemCount,
        paymentMethod: lastCompletedSale.paymentMethod,
        isContingency: lastCompletedSale.isContingency,
        qrCodeUrl: lastCompletedSale.qrCodeUrl
      })
    );
    popup.document.close();
    popup.focus();
    popup.print();
    setReceiptOpen(false);
  }

  function handleWhatsappReceipt() {
    if (!lastCompletedSale) return;
    const link = getClienteWhatsappLink(lastCompletedSale.cliente);
    if (!link) return;
    const message = encodeURIComponent(
      buildReceiptMessage({
        numero: lastCompletedSale.numero,
        cliente: lastCompletedSale.cliente,
        total: lastCompletedSale.total,
        itemCount: lastCompletedSale.itemCount,
        paymentMethod: lastCompletedSale.paymentMethod
      })
    );
    window.open(`${link}?text=${message}`, '_blank', 'noopener,noreferrer');
    setReceiptOpen(false);
  }

  useKeyboardShortcuts([
    {
      key: '/',
      preventDefault: true,
      handler: () => productInputRef.current?.focus()
    },
    {
      key: 'F2',
      preventDefault: true,
      handler: () => void handleFinalizeSale()
    },
    {
      key: 'F9',
      preventDefault: true,
      handler: () => void handleFinalizeSale()
    },
    {
      key: 'F4',
      preventDefault: true,
      handler: () => setDrawerOpen((prev) => !prev)
    },
    {
      key: 'Delete',
      preventDefault: true,
      enabled: !!focusedItemKey,
      handler: () => {
        if (focusedItemKey) removeItem(focusedItemKey);
      }
    },
    {
      key: 'Escape',
      preventDefault: true,
      enabled:
        !clienteModalOpen &&
        !mixedModalOpen &&
        !receiptOpen &&
        !discountModalOpen &&
        items.length > 0,
      handler: () => setCancelConfirmOpen(true)
    }
  ]);

  if (initialLoading) {
    return (
      <main className="rf-content">
        <div className="rf-pdv-shell-state">Preparando o PDV...</div>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="rf-content">
        <ErrorState
          title={pageError}
          description="O PDV precisa da sessão, da filial ativa e da configuração do Supabase para começar."
          onRetry={() => void loadNextPedidoNumber()}
        />
      </main>
    );
  }

  return (
    <main className="rf-content rf-pdv-page" data-testid="pdv-page">
      <section className="rf-pdv">
        <div className="rf-pdv__layout">
          <section className="rf-pdv__left rf-pdv-glass-card">
            <PdvLeftPanelHeader
              pdvViewMode={pdvViewMode}
              setPdvViewMode={(mode) => {
                setPdvViewMode(mode);
                if (mode === 'grid') {
                  const context = resolveContext();
                  if (context && catalogProducts.length === 0) {
                    searchProdutosPdv(context, '', 12).then((res) => {
                      setCatalogProducts(res.filter((p) => Number(p.esal) > 0));
                    });
                  }
                }
              }}
              pendingQueueCount={pendingQueueCount}
              saleToken={saleToken}
              nowFormatted={formatDateTime(now)}
            />

            <div className={`rf-pdv__search ${showScannerHalo ? 'rf-scanner-success-halo ' : ''}transition-all duration-300`}>
              <span className="rf-pdv__search-icon hover:scale-110 active:scale-95 transition-all text-emerald-400 cursor-pointer" aria-hidden="true" onClick={() => setIsScannerOpen(true)} title="Scanner de câmera">
                <Camera size={18} strokeWidth={2.5} />
              </span>
              <input
                ref={productInputRef}
                className="rf-pdv__search-input focus:border-emerald-500/40"
                type="search"
                placeholder="Buscar produto por nome ou código…"
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown' && productResults.length > 0) {
                    event.preventDefault();
                    setActiveSuggestionIndex((current) => Math.min(productResults.length - 1, current + 1));
                    return;
                  }
                  if (event.key === 'ArrowUp' && productResults.length > 0) {
                    event.preventDefault();
                    setActiveSuggestionIndex((current) => Math.max(0, current - 1));
                    return;
                  }
                  if (event.key === 'Enter' && productResults.length > 0) {
                    event.preventDefault();
                    handleSelectProduto(productResults[activeSuggestionIndex] ?? productResults[0]);
                    return;
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setProductQuery('');
                    setProductResults([]);
                    setProductSearchError(null);
                  }
                }}
              />
              <span className="rf-pdv__search-shortcut">/</span>
            </div>

            {(productQuery.trim() || productSearching || productSearchError) && (
              <div className="rf-pdv__suggestions">
                {productSearching ? <div className="rf-pdv__suggestions-empty">Buscando produtos...</div> : null}
                {!productSearching && productSearchError ? (
                  <div className="rf-pdv__suggestions-empty is-error">{productSearchError}</div>
                ) : null}
                {!productSearching && !productSearchError && productResults.length === 0 && productQuery.trim() ? (
                  <div className="rf-pdv__suggestions-empty">Nenhum produto encontrado.</div>
                ) : null}
                {!productSearching && !productSearchError && productResults.length > 0 ? (
                  <>
                    {productResults.map((produto, index) => {
                      const isActive = index === activeSuggestionIndex;
                      const stock = Number.isFinite(Number(produto.esal)) ? Number(produto.esal) : null;
                      return (
                        <button
                          key={produto.id}
                          type="button"
                          className={`rf-pdv__suggestion ${isActive ? 'is-active' : ''}`}
                          onMouseEnter={() => setActiveSuggestionIndex(index)}
                          onClick={() => handleSelectProduto(produto)}
                        >
                          <div className="rf-pdv__suggestion-copy">
                            <strong>{produto.nome}</strong>
                            <span>
                              {stock !== null ? `Estoque ${stock}` : 'Sem saldo'} ·{' '}
                              {produto.codigo_barras || produto.sku || produto.codigo_fornecedor || 'Sem código'}
                            </span>
                          </div>
                          <div className="rf-pdv__suggestion-meta">
                            <strong>{formatCurrencyBRL(roundCurrency(createCartItemFromProduto(produto).preco))}</strong>
                            {isActive ? <span>Enter</span> : null}
                            {stock !== null && stock <= 0 ? <em>Sem estoque</em> : null}
                          </div>
                        </button>
                      );
                    })}
                    <div className="rf-pdv__suggestions-foot">
                      {productSearchMs !== null ? `Última busca em ${productSearchMs}ms` : 'Busca rápida ativa'}
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {pdvViewMode === 'grid' ? (
              <PdvCartGrid
                products={catalogProducts}
                onAddProduct={(p) => {
                  addItem(createCartItemFromProduto(p));
                  setShowScannerHalo(true);
                  setTimeout(() => setShowScannerHalo(false), 800);
                  toast.success(`${p.nome} adicionado!`);
                }}
              />
            ) : (
              <PdvCartItems
                items={items}
                focusedItemKey={focusedItemKey}
                setFocusedItemKey={setFocusedItemKey}
                incrementItem={incrementItem}
                decrementItem={decrementItem}
                setItemQty={setItemQty}
                removeItem={removeItem}
              />
            )}

            <PdvCartSummary
              totals={totals}
              appliedVale={appliedVale}
              finalTotal={finalTotal}
              onOpenDiscountModal={() => setDiscountModalOpen(true)}
              onOpenCancelConfirm={() => setCancelConfirmOpen(true)}
            />
          </section>

          <aside className="rf-pdv__right">
            <section className="rf-pdv__panel rf-pdv-glass-card">
              <header className="rf-pdv__panel-head">
                <div className="rf-pdv__title">Cliente</div>
                <Button variant="secondary" size="sm" className="rf-pdv-btn-premium" onClick={() => setClienteModalOpen(true)}>
                  {selectedCliente ? 'Alterar' : 'Selecionar'}
                </Button>
              </header>
              {selectedCliente ? (
                <div className="rf-pdv__cliente">
                  <div className="rf-pdv__cliente-info">
                    <div className="flex items-center gap-2">
                      <strong>{selectedCliente.nome}</strong>
                      {selectedCliente.is_defaulter && (
                        <span className="text-[9px] font-black uppercase bg-rose-500/15 text-rose-400 border border-rose-500/25 px-1.5 py-0.5 rounded animate-pulse" data-testid="pdv-cliente-defaulter-badge">
                          Inadimplente
                        </span>
                      )}
                    </div>
                    <span>{selectedCliente.doc || 'Sem documento'}</span>
                  </div>
                  <button className="rf-pdv__cliente-remove" type="button" onClick={() => setSelectedCliente(null)}>
                    Remover
                  </button>
                </div>
              ) : (
                <div className="rf-pdv__panel-empty">Consumidor final</div>
              )}
            </section>

            {/* Premium Vale-Troca Resgate Panel */}
            <section className="rf-pdv__panel rf-pdv-glass-card" style={{ marginTop: '1rem' }}>
              <header className="rf-pdv__panel-head flex items-center justify-between">
                <div className="rf-pdv__title flex items-center gap-1.5 text-xs font-black uppercase text-teal-400">
                  <Ticket size={14} className="text-teal-400" />
                  Cupom de Vale-Troca
                </div>
                {appliedVale && (
                  <button 
                    onClick={() => setAppliedVale(null)}
                    className="hover:text-rose-300 text-sm font-medium text-slate-400"
                  >
                    Remover
                  </button>
                )}
              </header>

              {appliedVale ? (
                <div className="p-3 bg-teal-500/5 border border-teal-500/10 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-mono font-black text-white">{appliedVale.codigo}</div>
                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">Saldo de troca ativo</div>
                  </div>
                  <strong className="text-teal-400 text-sm font-black">− {formatCurrencyBRL(appliedVale.valor)}</strong>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="VALE-XXXXXX"
                      value={valeCodigoInput}
                      onChange={(e) => setValeCodigoInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-teal-500 focus:outline-none placeholder-slate-600 focus-visible:ring-1 focus-visible:ring-teal-500/50 text-sm font-medium text-slate-400"
                    />
                    <button
                      type="button"
                      disabled={isValeLoading || !valeCodigoInput.trim()}
                      onClick={async () => {
                        setIsValeLoading(true);
                        try {
                          const ctx = resolveContext();
                          if (!ctx) throw new Error('API context not ready');
                          const vale = await getValeTroca(ctx, valeCodigoInput.trim());
                          if (!vale) {
                            toast.error('Cupom de vale-troca não encontrado');
                          } else if (vale.status !== 'ativo') {
                            toast.error('Este vale-troca já foi utilizado');
                          } else {
                            setAppliedVale({
                              id: vale.id,
                              codigo: vale.codigo,
                              valor: Number(vale.valor)
                            });
                            toast.success(`Vale-Troca de ${formatCurrencyBRL(Number(vale.valor))} aplicado com sucesso!`);
                            setValeCodigoInput('');
                          }
                        } catch (err: any) {
                          toast.error(err.message || 'Erro ao validar vale-troca');
                        } finally {
                          setIsValeLoading(false);
                        }
                      }}
                      className="rounded-lg bg-teal-500/10 border border-teal-500/25 px-3 py-1.5 text-xs font-black uppercase text-teal-400 hover:bg-teal-500/20 active:scale-[0.98] transition-all disabled:opacity-40"
                    >
                      {isValeLoading ? '...' : 'Aplicar'}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="rf-pdv__panel rf-pdv-glass-card is-expanded" style={{ marginTop: '1rem' }}>
              <header className="rf-pdv__panel-head">
                <div className="rf-pdv__title">Pagamento</div>
              </header>
              {selectedCliente?.is_defaulter && (
                <div className="text-[10px] font-bold text-rose-400 bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-lg mb-3">
                  Atenção: Este cliente possui restrições financeiras (Inadimplente). Venda a prazo (Fiado) está bloqueada.
                </div>
              )}
              <div className="rf-pdv__payments">
                {PAYMENT_OPTIONS.map((option) => {
                  const isActive = paymentMethod === option.value;
                  const isDisabled = 
                    (option.disabledWithoutCliente && !selectedCliente) ||
                    (option.value === 'fiado' && selectedCliente?.is_defaulter);
                  return (
                    <button
                      key={option.value}
                      className={`rf-pdv__payment-btn rf-pdv-btn-premium ${isActive ? 'is-active bg-emerald-500/10 border-emerald-500/30' : ''}`}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setPaymentMethod(option.value)}
                    >
                      <span className="rf-pdv__payment-emoji">{option.emoji}</span>
                      <span className="rf-pdv__payment-label">{option.label}</span>
                      {isActive ? <span className="rf-pdv__payment-check text-emerald-400">✓</span> : null}
                    </button>
                  );
                })}
              </div>
              {paymentMethod === 'misto' && (
                <div className="rf-pdv__payment-meta">
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => setMixedModalOpen(true)}>
                    Configurar Misto ({mixedValidation.parts.length} part{mixedValidation.parts.length === 1 ? 'e' : 'es'})
                  </Button>
                </div>
              )}
            </section>

            <div className="rf-pdv__finalize mt-4">
              <Button
                variant="primary"
                className="w-full bg-gold-premium-gradient text-slate-900 font-extrabold shadow-lg hover:brightness-110 rf-pdv-btn-premium border-none"
                size="lg"
                disabled={!canFinalize}
                loading={saving}
                onClick={() => void handleFinalizeSale()}
              >
                Finalizar Venda (F9)
              </Button>
            </div>
          </aside>
        </div>

        {/* Shortcuts Panel */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-slate-400 text-xs py-3 px-4 bg-slate-950/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-inner">
          <span className="flex items-center gap-1.5"><kbd className="rf-shortcut-badge">Esc</kbd> Cancelar Venda</span>
          <span className="flex items-center gap-1.5"><kbd className="rf-shortcut-badge">F2</kbd> Selecionar Cliente</span>
          <span className="flex items-center gap-1.5"><kbd className="rf-shortcut-badge">F7</kbd> Aplicar Desconto</span>
          <span className="flex items-center gap-1.5"><kbd className="rf-shortcut-badge">F8</kbd> Pagamento Misto</span>
          <span className="flex items-center gap-1.5"><kbd className="rf-shortcut-badge">F9</kbd> Confirmar & Finalizar</span>
          <span className="flex items-center gap-1.5"><kbd className="rf-shortcut-badge">/</kbd> Focar Busca</span>
        </div>
      </section>

      <PdvClienteModal
        open={clienteModalOpen}
        query={clienteQuery}
        results={clienteResults}
        loading={clienteSearching}
        error={clienteSearchError}
        onClose={() => setClienteModalOpen(false)}
        onQueryChange={setClienteQuery}
        onSelect={(cliente) => {
          setSelectedCliente(cliente);
          setClienteModalOpen(false);
        }}
      />

      <PdvPagamentoMistoModal
        open={mixedModalOpen}
        total={totals.total}
        initialParts={mixedPayments}
        cliente={selectedCliente}
        onClose={() => setMixedModalOpen(false)}
        onSave={(parts) => {
          setMixedPayments(parts);
          setMixedModalOpen(false);
        }}
      />

      <Modal open={discountModalOpen} title="Aplicar desconto" onClose={() => setDiscountModalOpen(false)}>
        <div className="rf-ui-stack">
          <p className="table-cell-muted">Informe o valor em reais que deseja descontar do total bruto ({formatCurrencyBRL(totals.subtotal)}).</p>
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Valor do desconto"
              type="text"
              inputMode="decimal"
              autoFocus
              value={discountDraft}
              onChange={(event) => setDiscountDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleApplyDiscount();
              }}
            />
          </div>
          <div className="flex items-center justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setDiscountModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleApplyDiscount}>
              Aplicar desconto
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={cancelConfirmOpen} title="Cancelar venda?" onClose={() => setCancelConfirmOpen(false)}>
        <div className="rf-ui-stack">
          <p>Tem certeza que deseja cancelar esta venda? Todos os itens do carrinho serão removidos.</p>
          <div className="flex items-center justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setCancelConfirmOpen(false)}>
              Não, continuar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetCurrentSale();
                setCancelConfirmOpen(false);
              }}
            >
              Sim, cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <PdvComprovanteModal
        open={receiptOpen}
        countdown={receiptCountdown}
        onClose={() => setReceiptOpen(false)}
        onPrint={handlePrintReceipt}
        onWhatsapp={handleWhatsappReceipt}
        canWhatsapp={!!getClienteWhatsappLink(lastCompletedSale?.cliente ?? null)}
      />
      {isScannerOpen && (
        <ScannerModal 
          onScan={handleScanResult}
          onClose={() => setIsScannerOpen(false)}
          title="Leitor de Código Nexus"
        />
      )}

      <PdvSearchDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        query={drawerQuery}
        onQueryChange={(val) => {
          setDrawerQuery(val);
          if (!val.trim()) {
            setDrawerResults([]);
            return;
          }
          const context = resolveContext();
          if (!context) return;
          setDrawerSearching(true);
          searchProdutosPdv(context, val, 5)
            .then(setDrawerResults)
            .finally(() => setDrawerSearching(false));
        }}
        searching={drawerSearching}
        results={drawerResults}
        selectedProduto={selectedDrawerProduto}
        onSelectProduto={setSelectedDrawerProduto}
        onAddToCart={(prod) => {
          addItem(createCartItemFromProduto(prod));
          toast.success(`Adicionado: ${prod.nome}`);
          setSelectedDrawerProduto(null);
        }}
      />
    </main>
  );
}
