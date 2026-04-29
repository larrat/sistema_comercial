import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ClienteProfilePage } from '../components/ClienteProfilePage';
import { useClienteProfile } from '../hooks/useClienteProfile';

export function ClienteProfileRoutePage() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();
  const { cliente, loading, error, reload, setCliente } = useClienteProfile(clienteId);

  const handleBack = useCallback(() => {
    navigate('/app/clientes');
  }, [navigate]);

  if (!clienteId) {
    return (
      <main className="rf-content rf-ui-stack">
        <div className="card-shell">
          <p>Cliente não informado.</p>
          <button className="btn btn-sm" type="button" onClick={handleBack}>
            Voltar para clientes
          </button>
        </div>
      </main>
    );
  }

  if (!cliente && error) {
    return (
      <main className="rf-content rf-ui-stack">
        <div className="card-shell rf-ui-stack">
          <p>{error}</p>
          <div className="fg2">
            <button className="btn btn-sm" type="button" onClick={() => void reload()}>
              Tentar novamente
            </button>
            <button className="btn btn-sm" type="button" onClick={handleBack}>
              Voltar para clientes
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!cliente) {
    return (
      <main className="rf-content rf-ui-stack">
        <div className="card-shell">
          <p>Carregando cliente...</p>
        </div>
      </main>
    );
  }

  return (
    <ClienteProfilePage
      cliente={cliente}
      loadingCliente={loading}
      onClienteSaved={setCliente}
      onReload={reload}
    />
  );
}
