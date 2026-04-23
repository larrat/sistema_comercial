export type ToastSeverity = 'info' | 'success' | 'warning' | 'error';

export type LoadingDetail = {
  active?: boolean;
  label?: string;
};

type LegacyEventMap = {
  'sc:toast': { message?: string; severity?: ToastSeverity };
  'sc:react-loading': LoadingDetail;
  'sc:cliente-salvo': unknown;
  'sc:cliente-removido': { id?: string };
  'sc:produto-salvo': unknown;
  'sc:produto-removido': { id?: string };
  'sc:conta-receber-criada': unknown;
  'sc:contas-receber-sync': unknown;
  'sc:abrir-novo-produto': unknown;
  'sc:abrir-mov-produto': { id?: string };
};

type LegacyEventName = keyof LegacyEventMap;

export function emitLegacyEvent<K extends LegacyEventName>(
  type: K,
  detail?: LegacyEventMap[K]
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

export function subscribeLegacyEvent<K extends LegacyEventName>(
  type: K,
  handler: (detail: LegacyEventMap[K], event: Event) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const listener: EventListener = (event) => {
    const detail = (event as CustomEvent<LegacyEventMap[K]>).detail;
    handler(detail, event);
  };

  window.addEventListener(type, listener);
  return () => window.removeEventListener(type, listener);
}

export function emitToast(message: string, severity: ToastSeverity = 'info'): void {
  emitLegacyEvent('sc:toast', { message, severity });
}

export function subscribeToast(
  handler: (detail: { message?: string; severity?: ToastSeverity }) => void
): () => void {
  return subscribeLegacyEvent('sc:toast', (detail) => handler(detail || {}));
}

export function subscribeLoading(
  handler: (detail: LoadingDetail) => void
): () => void {
  return subscribeLegacyEvent('sc:react-loading', (detail) => handler(detail || {}));
}
