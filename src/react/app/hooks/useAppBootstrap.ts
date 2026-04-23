import { useEffect, useMemo, useState } from 'react';

import { useAuthStore } from '../useAuthStore';
import { useFilialStore } from '../useFilialStore';

export type AppBootstrapStatus =
  | 'unknown'
  | 'unauthenticated'
  | 'authenticated_without_filial'
  | 'authenticated_with_filial';

export type AppBootstrapState = {
  status: AppBootstrapStatus;
  filialId: string | null;
  retry: () => Promise<void>;
};

export function useAppBootstrap(): AppBootstrapState {
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const authStatus = useAuthStore((state) => state.status);
  const hydrateFilial = useFilialStore((state) => state.hydrate);
  const filialId = useFilialStore((state) => state.filialId);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);

  async function runBootstrap() {
    setHasBootstrapped(false);
    hydrateFilial();
    await hydrateAuth();
    setHasBootstrapped(true);
  }

  useEffect(() => {
    void runBootstrap();
  }, [hydrateAuth, hydrateFilial]);

  const status = useMemo<AppBootstrapStatus>(() => {
    if (!hasBootstrapped || authStatus === 'unknown') return 'unknown';
    if (authStatus === 'unauthenticated') return 'unauthenticated';
    if (!filialId) return 'authenticated_without_filial';
    return 'authenticated_with_filial';
  }, [authStatus, filialId, hasBootstrapped]);

  return {
    status,
    filialId,
    retry: runBootstrap
  };
}
