import { PageHeader, EmptyState } from '../../../shared/ui';
import { useRcasStore } from '../store/useRcasStore';
import { useRcasMutations } from '../hooks/useRcasMutations';
import { RcaModal } from './RcaModal';
import type { Rca } from '../../../../types/domain';

function RcaRow({ rca }: { rca: Rca }) {
  const openModal = useRcasStore((s) => s.openModal);
  const { desativar } = useRcasMutations();

  return (
    <div className="rrow rf-rca-row">
      <div className="rf-rca-inicial">{rca.inicial || rca.nome.slice(0, 2).toUpperCase()}</div>
      <div className="rf-rca-info">
        <span className="rf-rca-nome">{rca.nome}</span>
        {rca.ativo === false && <span className="bdg">Inativo</span>}
      </div>
      <div className="rf-rca-actions">
        <button className="btn btn-sm" type="button" onClick={() => openModal(rca)}>
          Editar
        </button>
        {rca.ativo !== false && (
          <button className="btn btn-sm" type="button" onClick={() => void desativar(rca.id)}>
            Desativar
          </button>
        )}
      </div>
    </div>
  );
}

export function RcasPage() {
  const rcas = useRcasStore((s) => s.rcas);
  const loading = useRcasStore((s) => s.loading);
  const error = useRcasStore((s) => s.error);
  const openModal = useRcasStore((s) => s.openModal);

  const ativos = rcas.filter((r) => r.ativo !== false);
  const inativos = rcas.filter((r) => r.ativo === false);

  return (
    <main className="rf-content rf-ui-stack">
      <PageHeader
        kicker="Cadastros"
        title="Vendedores"
        description="Cadastro e gestão de vendedores (RCAs) da filial."
        actions={
          <button className="btn btn-p btn-sm" type="button" onClick={() => openModal()}>
            + Novo vendedor
          </button>
        }
      />

      {error && <div className="rf-error-banner">{error}</div>}

      {loading && !rcas.length && <EmptyState title="Carregando vendedores..." />}

      {!loading && !rcas.length && (
        <EmptyState
          title="Nenhum vendedor cadastrado"
          description="Cadastre o primeiro vendedor para começar a vincular pedidos e clientes."
          action={
            <button className="btn btn-p" type="button" onClick={() => openModal()}>
              Cadastrar vendedor
            </button>
          }
        />
      )}

      {ativos.length > 0 && (
        <section>
          <div className="rf-ui-section-header">
            <span>Ativos ({ativos.length})</span>
          </div>
          <div className="rf-rca-list">
            {ativos.map((r) => (
              <RcaRow key={r.id} rca={r} />
            ))}
          </div>
        </section>
      )}

      {inativos.length > 0 && (
        <section>
          <div className="rf-ui-section-header">
            <span>Inativos ({inativos.length})</span>
          </div>
          <div className="rf-rca-list">
            {inativos.map((r) => (
              <RcaRow key={r.id} rca={r} />
            ))}
          </div>
        </section>
      )}

      <RcaModal />
    </main>
  );
}
