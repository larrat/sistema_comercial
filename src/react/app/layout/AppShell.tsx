import { Outlet } from 'react-router-dom';

import { GlobalLoadingOverlay } from '../ui/GlobalLoadingOverlay';
import { GlobalToastHost } from '../ui/GlobalToastHost';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';

import { useUIStore } from '../useUIStore';

export function AppShell() {
  const { sidebarCollapsed: collapsed } = useUIStore();
  
  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <AppSidebar />
      <div className={`flex flex-1 flex-col min-w-0 transition-all duration-300 ${collapsed ? 'ml-6' : 'ml-10'}`}>
        <main className="flex-1 overflow-auto pr-10 py-6">
          <Outlet />
        </main>
      </div>
      <GlobalLoadingOverlay />
      <GlobalToastHost />
    </div>
  );
}
