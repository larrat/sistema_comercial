import { useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { selectPedidosForTab, usePedidoStore } from '../store/usePedidoStore';
import { PedidoListView } from './PedidoListView';
import type { PedidoTab } from '../types';

const MESSAGE_SOURCE = 'pedidos-react-pilot';
const COMMAND_SOURCE = 'pedidos-legacy-shell';

export function PedidosPilotPage() {
  const pedidos = usePedidoStore(useShallow((s) => s.pedidos));
  const activeTab = usePedidoStore((s) => s.activeTab);
  const setActiveTab = usePedidoStore((s) => s.setActiveTab);
  const filtro = usePedidoStore((s) => s.filtro);
  const clearFiltro = usePedidoStore((s) => s.clearFiltro);
  const storeStatus = usePedidoStore((s) => s.status);
  const storeError = usePedidoStore((s) => s.error);
  const visiblePedidos = usePedidoStore(useShallow(selectPedidosForTab));

  // Responde a comandos do shell legado
  useEffect(() => {
    function handleCommand(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== COMMAND_SOURCE) return;

      if (data.type === 'pedidos:set-tab' && data.tab) {
        setActiveTab(data.tab as PedidoTab);
        return;
      }

      if (data.type === 'pedidos:limpar-filtros') {
        clearFiltro();
        return;
      }
    }

    window.addEventListener('message', handleCommand);
    return () => window.removeEventListener('message', handleCommand);
  }, [setActiveTab, clearFiltro]);

  // Publica estado de volta ao shell legado
  useEffect(() => {
    const filtersActive = [filtro.q, filtro.status].filter(Boolean).length;
    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: 'pedidos:state',
        state: {
          tab: activeTab,
          status: storeStatus === 'loading' ? 'loading' : storeError ? 'error' : 'ready',
          count: visiblePedidos.length,
          filtersActive,
          totalPedidos: pedidos.length
        }
      },
      window.location.origin
    );
  }, [activeTab, storeStatus, storeError, filtro.q, filtro.status, visiblePedidos.length, pedidos.length]);

  return (
    <div data-testid="pedidos-pilot-page">
      <PedidoListView />
    </div>
  );
}
