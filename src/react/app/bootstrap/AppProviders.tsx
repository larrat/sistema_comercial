import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { AppErrorBoundary } from '../ui/AppErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de cache
      gcTime: 1000 * 60 * 30, // 30 minutos de Garbage Collection
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        {children}
      </AppErrorBoundary>
      <Toaster 
        position="top-right" 
        richColors 
        expand={false}
        theme="dark"
        toastOptions={{
          style: {
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            color: '#f8fafc',
          },
        }}
      />
    </QueryClientProvider>
  );
}
