import type { ReactNode } from 'react';

import type { AppBootstrapState } from '../hooks/useAppBootstrap';

type AuthGateProps = {
  bootstrap: AppBootstrapState;
  children: ReactNode;
};

function BootstrapLoading() {
  return (
    <div className="rf-shell-state">
      <div className="sk-card" style={{ width: 320 }}>
        <div className="sk-line" />
        <div className="sk-line" />
      </div>
    </div>
  );
}

function LoginScreen({ onRetry }: { onRetry: () => Promise<void> }) {
  return (
    <div className="rf-shell-state">
      <div className="empty">
        <div className="ico">AU</div>
        <p>Sessão não encontrada. O login ainda acontece no sistema principal.</p>
        <button className="btn btn-sm" type="button" onClick={() => void onRetry()}>
          Revalidar sessão
        </button>
      </div>
    </div>
  );
}

function SetupScreen({ onRetry }: { onRetry: () => Promise<void> }) {
  return (
    <div className="rf-shell-state">
      <div className="empty">
        <div className="ico">FI</div>
        <p>Nenhuma filial ativa encontrada. O setup ainda depende da seleção de filial do shell legado.</p>
        <button className="btn btn-sm" type="button" onClick={() => void onRetry()}>
          Revalidar filial
        </button>
      </div>
    </div>
  );
}

export function AuthGate({ bootstrap, children }: AuthGateProps) {
  if (bootstrap.status === 'unknown') {
    return <BootstrapLoading />;
  }

  if (bootstrap.status === 'unauthenticated') {
    return <LoginScreen onRetry={bootstrap.retry} />;
  }

  if (bootstrap.status === 'authenticated_without_filial') {
    return <SetupScreen onRetry={bootstrap.retry} />;
  }

  if (bootstrap.status === 'authenticated_with_filial') {
    return <>{children}</>;
  }

  return (
    <div className="rf-shell-state">
      <div className="empty">
        <div className="ico">RF</div>
        <p>Estado de bootstrap não reconhecido.</p>
      </div>
    </div>
  );
}
