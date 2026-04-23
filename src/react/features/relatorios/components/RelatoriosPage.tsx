import { PageHeader } from '../../../shared/ui';
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
    <main className="rf-content rf-ui-stack rel-bento-page">
      <PageHeader
        kicker="Análise"
        title="Relatórios"
        description="Oportunidades por jogos, performance comercial e análise da base de clientes."
      />

      {error && <div className="rf-error-banner">{error}</div>}

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

      {loading && (
        <div className="empty"><p>Carregando dados...</p></div>
      )}

      {!loading && activeTab === 'oportunidades' && <OportunidadesTab />}
      {!loading && activeTab === 'performance' && <PerformanceTab />}
      {!loading && activeTab === 'clientes' && <ClientesTab />}

      <ValidacaoModal />
    </main>
  );
}
