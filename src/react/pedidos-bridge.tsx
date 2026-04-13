import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { PedidosPilotPage } from './features/pedidos/components/PedidosPilotPage';
import { usePedidoData } from './features/pedidos/hooks/usePedidoData';
import { hydrateBridgeStores } from './app/bridgeHydration';

hydrateBridgeStores();

let reactRoot: ReturnType<typeof createRoot> | null = null;

function PedidosApp() {
  usePedidoData();
  return <PedidosPilotPage />;
}

function mountPedidos(el: HTMLElement) {
  reactRoot = createRoot(el);
  reactRoot.render(
    <StrictMode>
      <PedidosApp />
    </StrictMode>
  );
}

function unmountPedidos() {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
}

window.__SC_PEDIDOS_DIRECT_BRIDGE__ = {
  mount: mountPedidos,
  unmount: unmountPedidos
};
