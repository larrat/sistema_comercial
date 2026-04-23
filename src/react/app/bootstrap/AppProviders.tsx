import type { ReactNode } from 'react';

import { AppErrorBoundary } from '../ui/AppErrorBoundary';

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return <AppErrorBoundary>{children}</AppErrorBoundary>;
}
