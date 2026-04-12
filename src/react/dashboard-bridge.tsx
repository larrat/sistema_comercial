import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { DashboardPilotPage } from './features/dashboard/components/DashboardPilotPage';
import { useDashboardData } from './features/dashboard/hooks/useDashboardData';
import { hydrateBridgeStores } from './app/bridgeHydration';

hydrateBridgeStores();

let reactRoot: ReturnType<typeof createRoot> | null = null;

function DashboardApp() {
  useDashboardData();
  return <DashboardPilotPage />;
}

function mountDashboard(el: HTMLElement) {
  reactRoot = createRoot(el);
  reactRoot.render(
    <StrictMode>
      <DashboardApp />
    </StrictMode>
  );
}

function unmountDashboard() {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
}

window.__SC_DASHBOARD_DIRECT_BRIDGE__ = {
  mount: mountDashboard,
  unmount: unmountDashboard
};
