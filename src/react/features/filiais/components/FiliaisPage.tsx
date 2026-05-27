import { useFiliaisStore } from '../store/useFiliaisStore';
import { useFiliaisData } from '../hooks/useFiliaisData';
import { FilialCard } from './FilialCard';
import { FilialModal } from './FilialModal';
import { EmptyState, ErrorState, PageHeader, StatCard, Button } from '../../../shared/ui';

export function FiliaisPage() {
  const { data: filiais = [], isLoading, error, refetch } = useFiliaisData();

  const openNew = useFiliaisStore((s) => s.openNew);

  return (
    <div className="w-full flex flex-col gap-8">
      <PageHeader
        kicker="Administração"
        title="Filiais"
        description="Gerencie as filiais da empresa e suas configurações."
        actions={
          <>
            <Button size="sm" onClick={() => void refetch()} loading={isLoading}>
              Atualizar
            </Button>
            <Button variant="primary" size="sm" onClick={openNew}>
              Nova filial
            </Button>
          </>
        }
      />

      {error && <ErrorState title={error instanceof Error ? error.message : String(error)} compact />}

      <section className="rf-ui-stat-grid--2">
        <StatCard label="Filiais" value={filiais.length} />
      </section>

      {filiais.length === 0 && !isLoading ? (
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
