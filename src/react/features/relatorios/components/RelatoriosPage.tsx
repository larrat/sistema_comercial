import { EmptyState, ErrorState, PageHeader } from '../../../shared/ui';
import { useRelatoriosStore } from '../store/useRelatoriosStore';
import { OportunidadesTab } from './OportunidadesTab';
import { PerformanceTab } from './PerformanceTab';
import { ClientesTab } from './ClientesTab';
import { ValidacaoModal } from './ValidacaoModal';
import type { RelatoriosTab } from '../store/useRelatoriosStore';

const TABS: { id: RelatoriosTab; label: string }[] = [
  { id: 'oportunidades', label: 'Oportunidades por jogos' },
  { id: 'performance', label: 'Performance comercial' },
  { id: 'clientes', label: 'Base de clientes' }
];

export function RelatoriosPage() {
  const activeTab = useRelatoriosStore((s) => s.activeTab);
  const setActiveTab = useRelatoriosStore((s) => s.setActiveTab);
  const loading = useRelatoriosStore((s) => s.loading);
  const error = useRelatoriosStore((s) => s.error);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex flex-col gap-6">
      <PageHeader
        kicker="Análise"
        title="Relatórios"
        description="Oportunidades por jogos, performance comercial e análise da base de clientes."
      />

      {error && <ErrorState title={error} compact />}

      <div className="tabs rel-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tb${activeTab === tab.id ? ' on' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <EmptyState title="Carregando dados..." compact />}

      {!loading && activeTab === 'oportunidades' && <OportunidadesTab />}
      {!loading && activeTab === 'performance' && <PerformanceTab />}
      {!loading && activeTab === 'clientes' && <ClientesTab />}

      <ValidacaoModal />
    </main>
  );
}
