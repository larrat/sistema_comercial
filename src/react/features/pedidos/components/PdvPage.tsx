import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useKeyboardShortcuts } from '../../../shared/hooks/useKeyboardShortcuts';
import { EmptyState, ErrorState, Modal, StatusBadge, Button, Input, ScannerModal } from '../../../shared/ui';
import { usePedidoMutations } from '../hooks/usePedidosQuery';
import { getNextPedidoNumber } from '../services/pedidosApi';
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
}): string {
  return `
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Comprovante PDV</title>
        <style>
          body { font-family: sans-serif; padding: 16px; color: #111827; }
          h1 { font-size: 18px; margin-bottom: 12px; }
          p { margin: 0 0 8px; font-size: 13px; }
        </style>
      </head>
      <body>
        <h1>Comprovante da venda</h1>
        <p>Venda #${args.numero}</p>
        <p>Data: ${args.createdAt}</p>
        <p>Cliente: ${args.cliente?.nome || 'Consumidor final'}</p>
        <p>Itens: ${args.itemCount}</p>
        <p>Pagamento: ${args.paymentMethod}</p>
        <p>Total: ${formatCurrencyBRL(args.total)}</p>
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
  } | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const productInputRef = useRef<HTMLInputElement>(null);
  const productSearchRequestRef = useRef(0);
  const clienteSearchRequestRef = useRef(0);
  const queueProcessingRef = useRef(false);

  const totals = useMemo(() => calculateCartTotals(items, discountValue), [items, discountValue]);
  const mixedValidation = useMemo(
    () => validateMixedPayments(mixedPayments, totals.total),
    [mixedPayments, totals.total]
  );
  const saving = save.isPending;
  const canFinalize =
    items.length > 0 &&
    !!paymentMethod &&
    (paymentMethod !== 'fiado' || !!selectedCliente) &&
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
          setProductResults(results);
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
    addItem(createCartItemFromProduto(produto));
    setProductQuery('');
    setProductResults([]);
    setProductSearchError(null);
    setActiveSuggestionIndex(0);
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
      obs: '',
      itens: buildPedidoItensFromCart(items, totals.discountValue),
      total: totals.total,
      origem_venda: 'pdv',
      pgto_meta:
        paymentMethod === 'misto'
          ? {
              method: paymentMethod,
              parts: mixedValidation.parts
            }
          : {
              method: paymentMethod
            },
      venda_fechada: true,
      venda_fechada_em: new Date().toISOString(),
      venda_fechada_por: getUserIdentifier(session)
    };

    try {
      await submitPdvPayload(payload);
      toast.success('Venda finalizada. O PDV já está pronto para a próxima.');
      setLastCompletedSale({
        numero: payload.num,
        total: payload.total,
        itemCount: items.length,
        paymentMethod: paymentLabel,
        cliente: selectedCliente,
        createdAt: formatDateTime(new Date())
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
        setLastCompletedSale({
          numero: payload.num,
          total: payload.total,
          itemCount: items.length,
          paymentMethod: paymentLabel,
          cliente: selectedCliente,
          createdAt: formatDateTime(new Date())
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
        paymentMethod: lastCompletedSale.paymentMethod
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
          <section className="rf-pdv__left">
            <header className="rf-pdv__panel-head">
              <div>
                <div className="rf-pdv__title">Nova venda</div>
              </div>
              <div className="rf-pdv__head-meta">
                {pendingQueueCount > 0 ? (
                  <StatusBadge tone="warning">
                    {pendingQueueCount} venda{pendingQueueCount > 1 ? 's' : ''} pendente{pendingQueueCount > 1 ? 's' : ''}
                  </StatusBadge>
                ) : null}
                <span>{saleToken}</span>
                <span>{formatDateTime(now)}</span>
              </div>
            </header>

            <div className="rf-pdv__search">
              <span className="rf-pdv__search-icon" aria-hidden="true" onClick={() => setIsScannerOpen(true)}>
                📷
              </span>
              <input
                ref={productInputRef}
                className="rf-pdv__search-input"
                type="search"
                placeholder="Buscar produto por nome ou código..."
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
                          className={`rf-pdv__suggestion\${isActive ? ' is-active' : ''}`}
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

            <div className="rf-pdv__cart">
              <div className="rf-pdv__cart-head">
                <span>Produto</span>
                <span>Qtd</span>
                <span>Unit</span>
                <span>Total</span>
                <span />
              </div>

              {items.length === 0 ? (
                <EmptyState
                  title="Carrinho vazio."
                  description="Digite um nome, código ou SKU e aperte Enter para acelerar a venda."
                  compact
                />
              ) : (
                <div className="rf-pdv__cart-rows">
                  {items.map((item) => {
                    const subtotal = roundCurrency(item.qty * item.preco);
                    const step = item.isWeight ? 0.001 : 1;
                    const isFocused = item.key === focusedItemKey;
                    return (
                      <div
                        key={item.key}
                        className={`rf-pdv__cart-row\${isFocused ? ' is-focused' : ''}`}
                        tabIndex={0}
                        onFocus={() => setFocusedItemKey(item.key)}
                        onKeyDown={(event) => {
                          if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            incrementItem(item.key);
                          } else if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            decrementItem(item.key);
                          } else if (event.key === 'Delete') {
                            event.preventDefault();
                            removeItem(item.key);
                          }
                        }}
                      >
                        <div className="rf-pdv__cart-product">
                          <strong>{item.nome}</strong>
                          <span>{item.code || item.un}</span>
                        </div>
                        <div className="rf-pdv__qty">
                          <button className="rf-pdv__qty-btn" type="button" onClick={() => decrementItem(item.key)}>
                            −
                          </button>
                          <input
                            className="rf-pdv__qty-input"
                            type="text"
                            inputMode="decimal"
                            value={formatQty(item.qty, item.isWeight)}
                            onChange={(event) => {
                              const next = parseDecimalInput(event.target.value);
                              if (next > 0) setItemQty(item.key, next);
                            }}
                          />
                          <button className="rf-pdv__qty-btn" type="button" onClick={() => incrementItem(item.key)}>
                            +
                          </button>
                        </div>
                        <div className="rf-pdv__unit">{formatCurrencyBRL(item.preco)}</div>
                        <div className="rf-pdv__total">{formatCurrencyBRL(subtotal)}</div>
                        <div className="rf-pdv__actions">
                          <button
                            className="rf-pdv__remove-btn"
                            type="button"
                            title="Remover (Delete)"
                            onClick={() => removeItem(item.key)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="rf-pdv__cart-foot">
              <div className="rf-pdv__cart-summary">
                <div className="rf-pdv__summary-row">
                  <span>Subtotal</span>
                  <strong>{formatCurrencyBRL(totals.subtotal)}</strong>
                </div>
                {totals.discountValue > 0 ? (
                  <div className="rf-pdv__summary-row is-discount">
                    <span>Desconto</span>
                    <strong>− {formatCurrencyBRL(totals.discountValue)}</strong>
                  </div>
                ) : null}
                <div className="rf-pdv__summary-row is-total">
                  <span>Total</span>
                  <strong>{formatCurrencyBRL(totals.total)}</strong>
                </div>
              </div>
              <div className="rf-pdv__cart-actions">
                <Button variant="secondary" onClick={() => setDiscountModalOpen(true)}>
                  Desconto (F7)
                </Button>
                <Button variant="secondary" onClick={() => setCancelConfirmOpen(true)}>
                  Cancelar (Esc)
                </Button>
              </div>
            </footer>
          </section>

          <aside className="rf-pdv__right">
            <section className="rf-pdv__panel">
              <header className="rf-pdv__panel-head">
                <div className="rf-pdv__title">Cliente</div>
                <Button variant="secondary" size="sm" onClick={() => setClienteModalOpen(true)}>
                  {selectedCliente ? 'Alterar' : 'Selecionar'}
                </Button>
              </header>
              {selectedCliente ? (
                <div className="rf-pdv__cliente">
                  <div className="rf-pdv__cliente-info">
                    <strong>{selectedCliente.nome}</strong>
                    <span>{selectedCliente.documento || 'Sem documento'}</span>
                  </div>
                  <button className="rf-pdv__cliente-remove" type="button" onClick={() => setSelectedCliente(null)}>
                    Remover
                  </button>
                </div>
              ) : (
                <div className="rf-pdv__panel-empty">Consumidor final</div>
              )}
            </section>

            <section className="rf-pdv__panel is-expanded">
              <header className="rf-pdv__panel-head">
                <div className="rf-pdv__title">Pagamento</div>
              </header>
              <div className="rf-pdv__payments">
                {PAYMENT_OPTIONS.map((option) => {
                  const isActive = paymentMethod === option.value;
                  const isDisabled = option.disabledWithoutCliente && !selectedCliente;
                  return (
                    <button
                      key={option.value}
                      className={`rf-pdv__payment-btn\${isActive ? ' is-active' : ''}`}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setPaymentMethod(option.value)}
                    >
                      <span className="rf-pdv__payment-emoji">{option.emoji}</span>
                      <span className="rf-pdv__payment-label">{option.label}</span>
                      {isActive ? <span className="rf-pdv__payment-check">✓</span> : null}
                    </button>
                  );
                })}
              </div>
              {paymentMethod === 'misto' && (
                <div className="rf-pdv__payment-meta">
                  <Button variant="secondary" size="sm" fullWidth onClick={() => setMixedModalOpen(true)}>
                    Configurar Misto ({mixedValidation.parts.length} part{mixedValidation.parts.length === 1 ? 'e' : 'es'})
                  </Button>
                </div>
              )}
            </section>

            <div className="rf-pdv__finalize">
              <Button
                variant="primary"
                fullWidth
                size="lg"
                disabled={!canFinalize}
                loading={saving}
                onClick={() => void handleFinalizeSale()}
              >
                Finalizar venda (F2)
              </Button>
            </div>
          </aside>
        </div>
      </section>

      <PdvClienteModal
        open={clienteModalOpen}
        query={clienteQuery}
        results={clienteResults}
        searching={clienteSearching}
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
        payments={mixedPayments}
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
        whatsappEnabled={!!getClienteWhatsappLink(lastCompletedSale?.cliente ?? null)}
      />
      {isScannerOpen && (
        <ScannerModal 
          onScan={handleScanResult}
          onClose={() => setIsScannerOpen(false)}
          title="Leitor de Código Nexus"
        />
      )}
    </main>
  );
}
