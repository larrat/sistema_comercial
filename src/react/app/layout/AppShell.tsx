import { Outlet } from 'react-router-dom';

import { GlobalLoadingOverlay } from '../ui/GlobalLoadingOverlay';
import { GlobalToastHost } from '../ui/GlobalToastHost';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';

import { useUIStore } from '../useUIStore';
import { useThemeSync } from '../hooks/useThemeSync';

export function AppShell() {
  const { sidebarCollapsed: collapsed } = useUIStore();
  useThemeSync();
  
  return (
    <div className={`flex h-screen w-full bg-surface-page text-primary font-sans selection:bg-teal-500/30 selection:text-teal-200 overflow-hidden`}>
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0 relative">
        <AppTopbar />
        <main className="flex-1 overflow-auto px-4 sm:px-8 py-6 pb-24 relative z-0">
          <Outlet />
        </main>
      </div>
      <GlobalLoadingOverlay />
      <GlobalToastHost />
    </div>
  );
}
