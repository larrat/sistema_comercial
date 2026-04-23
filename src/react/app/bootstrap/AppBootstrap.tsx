import { useEffect } from 'react';

import { AuthGate } from '../auth/AuthGate';
import { useAppBootstrap } from '../hooks/useAppBootstrap';
import { AppRouter } from '../router/AppRouter';
import { AppProviders } from './AppProviders';

export function AppBootstrap() {
  const bootstrap = useAppBootstrap();

  useEffect(() => {
    document.body.dataset.reactBootstrapState = bootstrap.status;
    if (bootstrap.filialId) {
      document.body.dataset.reactFilialId = bootstrap.filialId;
    } else {
      delete document.body.dataset.reactFilialId;
    }
  }, [bootstrap.filialId, bootstrap.status]);

  return (
    <AppProviders>
      <AuthGate bootstrap={bootstrap}>
        <AppRouter bootstrap={bootstrap} />
      </AuthGate>
    </AppProviders>
  );
}
