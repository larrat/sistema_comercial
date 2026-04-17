import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { ContasReceberPilotPage } from './features/contas-receber/components/ContasReceberPilotPage';
import { useContasReceberData } from './features/contas-receber/hooks/useContasReceberData';
import { hydrateBridgeStores } from './app/bridgeHydration';
import { useAuthStore } from './app/useAuthStore';
import { useFilialStore } from './app/useFilialStore';

hydrateBridgeStores();

let reactRoot: ReturnType<typeof createRoot> | null = null;

function ContasReceberApp() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateFilial = useFilialStore((s) => s.hydrate);

  useEffect(() => {
    hydrateFilial();
    void hydrateAuth();
  }, [hydrateAuth, hydrateFilial]);

  useContasReceberData();
  return <ContasReceberPilotPage />;
}

function mountContasReceber(el: HTMLElement) {
  hydrateBridgeStores();
  reactRoot = createRoot(el);
  reactRoot.render(
    <StrictMode>
      <ContasReceberApp />
    </StrictMode>
  );
}

function unmountContasReceber() {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
}

window.__SC_RECEBER_DIRECT_BRIDGE__ = {
  mount: mountContasReceber,
  unmount: unmountContasReceber
};
