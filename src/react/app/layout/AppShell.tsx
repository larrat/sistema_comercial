import { Outlet } from 'react-router-dom';

import { GlobalLoadingOverlay } from '../ui/GlobalLoadingOverlay';
import { GlobalToastHost } from '../ui/GlobalToastHost';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';

import { useUIStore } from '../useUIStore';

export function AppShell() {
  const { sidebarCollapsed: collapsed } = useUIStore();
  
  return (
    <div className={`flex min-h-screen w-full bg-surface-page text-primary font-sans selection:bg-cyan-500/30 selection:text-cyan-200`}>
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0 transition-all duration-300">
        <AppTopbar />
        <main className="flex-1 overflow-auto px-8 py-6">
          <Outlet />
        </main>
      </div>
      <GlobalLoadingOverlay />
      <GlobalToastHost />
    </div>
  );
}
