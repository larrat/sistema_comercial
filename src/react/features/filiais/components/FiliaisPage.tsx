import { useFiliaisStore } from '../store/useFiliaisStore';
import { useFiliaisData } from '../hooks/useFiliaisData';
import { FilialCard } from './FilialCard';
import { FilialModal } from './FilialModal';
import { PageHeader } from '../../../shared/ui/PageHeader';

export function FiliaisPage() {
  useFiliaisData();

  const filiais = useFiliaisStore((s) => s.filiais);
  const status = useFiliaisStore((s) => s.status);
  const error = useFiliaisStore((s) => s.error);
  const reload = useFiliaisStore((s) => s.reload);
  const openNew = useFiliaisStore((s) => s.openNew);

  const loading = status === 'loading';

  return (
    <div className="rf-ui-stack">
      <PageHeader
        kicker="Administração"
        title="Filiais"
        description="Gerencie as filiais da empresa e suas configurações."
        actions={
          <>
            <button className="btn btn-ghost" onClick={reload} disabled={loading}>
              {loading ? 'Carregando…' : 'Atualizar'}
            </button>
            <button className="btn btn-primary" onClick={openNew}>
              Nova filial
            </button>
          </>
        }
      />

      {error && <div className="rf-error-banner">{error}</div>}

      <div className="mg bento-band">
        <div className="met">
          <div className="ml">Filiais</div>
          <div className="mv">{filiais.length}</div>
        </div>
      </div>

      {filiais.length === 0 && !loading ? (
        <div className="card card-shell">
          <div className="empty">
            <div className="ico">FL</div>
            <p>Nenhuma filial cadastrada.</p>
            <button className="btn btn-primary" onClick={openNew}>
              Criar primeira filial
            </button>
          </div>
        </div>
      ) : (
        <div className="filiais-grid">
          {filiais.map((f) => (
            <FilialCard key={f.id} filial={f} />
          ))}
        </div>
      )}

      <FilialModal />
    </div>
  );
}
