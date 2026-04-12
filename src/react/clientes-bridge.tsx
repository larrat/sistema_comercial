import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { ClientesPilotPage } from './features/clientes/components/ClientesPilotPage';
import { useClienteStore } from './features/clientes/store/useClienteStore';
import { useAuthStore } from './app/useAuthStore';
import { useFilialStore } from './app/useFilialStore';

let reactRoot: ReturnType<typeof createRoot> | null = null;

function mountClientes(el: HTMLElement) {
  reactRoot = createRoot(el);
  reactRoot.render(
    <StrictMode>
      <ClientesPilotPage />
    </StrictMode>
  );
}

function unmountClientes() {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
}

declare global {
  interface Window {
    __SC_CLIENTES_DIRECT_BRIDGE__?: {
      mount: (el: HTMLElement) => void;
      unmount: () => void;
    };
    __SC_AUTH_SESSION__?: { access_token: string; refresh_token: string; token_type: string; expires_in: number; expires_at: number; user: null };
    __SC_FILIAL_ID__?: string;
  }
}

if (window.__SC_AUTH_SESSION__) {
  useAuthStore.setState({ session: window.__SC_AUTH_SESSION__, status: 'authenticated' });
}
if (window.__SC_FILIAL_ID__) {
  useFilialStore.setState({ filialId: window.__SC_FILIAL_ID__ });
}

useClienteStore.getState().fetchClientes();

window.__SC_CLIENTES_DIRECT_BRIDGE__ = {
  mount: mountClientes,
  unmount: unmountClientes
};
