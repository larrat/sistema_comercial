import { Outlet } from 'react-router-dom';

import { GlobalLoadingOverlay } from '../ui/GlobalLoadingOverlay';
import { GlobalToastHost } from '../ui/GlobalToastHost';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';

import { useUIStore } from '../useUIStore';

export function AppShell() {
  const { sidebarCollapsed: collapsed } = useUIStore();
  
  return (
    <div className={`flex min-h-screen w-full bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 selection:text-blue-200 ${collapsed ? 'gap-6' : 'gap-10'}`}>
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0 transition-all duration-300">
        <main className="flex-1 overflow-auto pr-10 py-6">
          <Outlet />
        </main>
      </div>
      <GlobalLoadingOverlay />
      <GlobalToastHost />
    </div>
  );
}
