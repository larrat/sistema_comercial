import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { GlobalLoadingOverlay } from '../ui/GlobalLoadingOverlay';
import { GlobalToastHost } from '../ui/GlobalToastHost';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';
import { CommandPalette } from '../components/CommandPalette';

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
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="h-8 w-8 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
              <span className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] animate-pulse">Carregando módulo…</span>
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <GlobalLoadingOverlay />
      <GlobalToastHost />
      <CommandPalette />
    </div>
  );
}
