import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { PedidosPilotPage } from './features/pedidos/components/PedidosPilotPage';
import { usePedidoData } from './features/pedidos/hooks/usePedidoData';
import { hydrateBridgeStores } from './app/bridgeHydration';
import { useAuthStore } from './app/useAuthStore';
import { useFilialStore } from './app/useFilialStore';

// Tenta hidratar via window globals (podem estar disponíveis se o legado os setou antes)
hydrateBridgeStores();

let reactRoot: ReturnType<typeof createRoot> | null = null;

function PedidosApp() {
  // Hidrata stores de auth e filial a partir do localStorage no momento do mount.
  // Isso garante que, mesmo que hydrateBridgeStores() tenha rodado antes dos globals
  // estarem disponíveis, o componente sempre terá sessão e filialId corretos.
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateFilial = useFilialStore((s) => s.hydrate);

  useEffect(() => {
    hydrateFilial();
    void hydrateAuth();
  }, [hydrateAuth, hydrateFilial]);

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
