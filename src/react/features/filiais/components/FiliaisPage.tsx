import { useFiliaisStore } from '../store/useFiliaisStore';
import { useFiliaisData } from '../hooks/useFiliaisData';
import { FilialCard } from './FilialCard';
import { FilialModal } from './FilialModal';
import { EmptyState, ErrorState, PageHeader, StatCard } from '../../../shared/ui';

export function FiliaisPage() {
  useFiliaisData();

  const filiais = useFiliaisStore((s) => s.filiais);
  const status = useFiliaisStore((s) => s.status);
  const error = useFiliaisStore((s) => s.error);
  const reload = useFiliaisStore((s) => s.reload);
  const openNew = useFiliaisStore((s) => s.openNew);

  const loading = status === 'loading';

  return (
    <div className="rf-content rf-ui-stack">
      <PageHeader
        kicker="Administração"
        title="Filiais"
        description="Gerencie as filiais da empresa e suas configurações."
        actions={
          <>
            <button className="btn btn-sm" onClick={reload} disabled={loading}>
              {loading ? 'Carregando…' : 'Atualizar'}
            </button>
            <button className="btn btn-p btn-sm" onClick={openNew}>
              Nova filial
            </button>
          </>
        }
      />

      {error && <ErrorState title={error} compact />}

      <section className="rf-ui-stat-grid--2">
        <StatCard label="Filiais" value={filiais.length} />
      </section>

      {filiais.length === 0 && !loading ? (
        <EmptyState
          title="Nenhuma filial cadastrada."
          action={
            <button className="btn btn-p btn-sm" onClick={openNew}>
              Criar primeira filial
            </button>
          }
        />
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
