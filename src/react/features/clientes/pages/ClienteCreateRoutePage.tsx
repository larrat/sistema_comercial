import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { buildClienteRoute } from '../../../app/router/wave1Navigation';
import { PageHeader } from '../../../shared/ui';
import { ClienteForm } from '../components/ClienteForm';

export function ClienteCreateRoutePage() {
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    navigate('/app/clientes');
  }, [navigate]);

  return (
    <main className="rf-content rf-cliente-create" data-testid="cliente-create-page">
      <PageHeader
        kicker="Relacionamento"
        title="Novo cliente"
        description="Cadastre todos os dados do cliente em uma página própria, com mais espaço e foco no formulário."
        actions={
          <button className="btn btn-sm" type="button" onClick={handleBack}>
            Voltar para clientes
          </button>
        }
      />

      <div className="rf-cliente-create__layout">
        <aside className="rf-cliente-create__rail" aria-label="Seções do cadastro">
          <div>
            <div className="rf-cliente-create__rail-kicker">Seções</div>
            <ol className="rf-cliente-create__steps">
              <li className="is-active">Essencial</li>
              <li>Comercial</li>
              <li>Localização</li>
              <li>Opt-ins</li>
            </ol>
          </div>
          <div className="rf-cliente-create__progress">
            <span>Preenchimento</span>
            <strong>Cadastro completo em página única</strong>
          </div>
        </aside>

        <section className="rf-cliente-create__form" aria-label="Cadastro do novo cliente">
          <ClienteForm
            analyticsOrigin="cliente_create_page"
            onSaved={(cliente) => {
              navigate(buildClienteRoute(cliente.id, { tab: 'cadastro' }));
            }}
            onCancel={handleBack}
          />
        </section>
      </div>
    </main>
  );
}
