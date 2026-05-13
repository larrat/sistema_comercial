import { useFiliaisStore } from '../store/useFiliaisStore';
import { useFiliaisData } from '../hooks/useFiliaisData';
import { FilialCard } from './FilialCard';
import { FilialModal } from './FilialModal';
import { EmptyState, ErrorState, PageHeader, StatCard, Button } from '../../../shared/ui';

export function FiliaisPage() {
  useFiliaisData();

  const filiais = useFiliaisStore((s) => s.filiais);
  const status = useFiliaisStore((s) => s.status);
  const error = useFiliaisStore((s) => s.error);
  const reload = useFiliaisStore((s) => s.reload);
  const openNew = useFiliaisStore((s) => s.openNew);

  const loading = status === 'loading';

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
      <PageHeader
        kicker="Administração"
        title="Filiais"
        description="Gerencie as filiais da empresa e suas configurações."
        actions={
          <>
            <Button size="sm" onClick={reload} loading={loading}>
              Atualizar
            </Button>
            <Button variant="primary" size="sm" onClick={openNew}>
              Nova filial
            </Button>
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
            <Button variant="primary" onClick={openNew}>
              Criar primeira filial
            </Button>
          }
        />
      ) : (
        <div className="rf-bento-grid">
          {filiais.map((f) => (
            <FilialCard key={f.id} filial={f} />
          ))}
        </div>
      )}

      <FilialModal />
    </div>
  );
}
