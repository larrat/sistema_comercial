import { useEffect } from 'react';

import { useAuthStore } from './app/useAuthStore';
import { useFilialStore } from './app/useFilialStore';
import { ClientesPilotPage } from './features/clientes/components/ClientesPilotPage';
import { useClienteData } from './features/clientes/hooks/useClienteData';

function ClientesPage() {
  useClienteData();
  return <ClientesPilotPage />;
}

export function App() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateFilial = useFilialStore((s) => s.hydrate);
  const authStatus = useAuthStore((s) => s.status);

  useEffect(() => {
    hydrateFilial();
    hydrateAuth();
  }, [hydrateAuth, hydrateFilial]);

  if (authStatus === 'unknown') {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="sk-card" style={{ width: 320 }}>
          <div className="sk-line" />
          <div className="sk-line" />
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center">
        <div className="empty">
          <div className="ico">CL</div>
          <p>Sessão não encontrada. Faça login no sistema principal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6 max-w-4xl mx-auto">
      <ClientesPage />
    </div>
  );
}
