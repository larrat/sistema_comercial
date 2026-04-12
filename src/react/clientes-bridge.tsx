import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { ClientesPilotPage } from './features/clientes/components/ClientesPilotPage';
import { useClienteData } from './features/clientes/hooks/useClienteData';
import { hydrateBridgeStores } from './app/bridgeHydration';

hydrateBridgeStores();

let reactRoot: ReturnType<typeof createRoot> | null = null;

function ClientesApp() {
  useClienteData();
  return <ClientesPilotPage />;
}

function mountClientes(el: HTMLElement) {
  reactRoot = createRoot(el);
  reactRoot.render(
    <StrictMode>
      <ClientesApp />
    </StrictMode>
  );
}

function unmountClientes() {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
}

window.__SC_CLIENTES_DIRECT_BRIDGE__ = {
  mount: mountClientes,
  unmount: unmountClientes
};
