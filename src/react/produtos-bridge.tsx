import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { ProdutosPilotPage } from './features/produtos/components/ProdutosPilotPage';
import { useProdutoData } from './features/produtos/hooks/useProdutoData';
import { hydrateBridgeStores } from './app/bridgeHydration';
import { useAuthStore } from './app/useAuthStore';
import { useFilialStore } from './app/useFilialStore';

hydrateBridgeStores();

let reactRoot: ReturnType<typeof createRoot> | null = null;

function ProdutosApp() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateFilial = useFilialStore((s) => s.hydrate);

  useEffect(() => {
    hydrateFilial();
    void hydrateAuth();
  }, [hydrateAuth, hydrateFilial]);

  useProdutoData();
  return <ProdutosPilotPage />;
}

function mountProdutos(el: HTMLElement) {
  hydrateBridgeStores();
  reactRoot = createRoot(el);
  reactRoot.render(
    <StrictMode>
      <ProdutosApp />
    </StrictMode>
  );
}

function unmountProdutos() {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
}

window.__SC_PRODUTOS_DIRECT_BRIDGE__ = {
  mount: mountProdutos,
  unmount: unmountProdutos
};
