import { LoadingState, ErrorState, PageHeader, SegmentedControl } from '../../../shared/ui';
import { useRelatoriosStore } from '../store/useRelatoriosStore';
import { OportunidadesTab } from './OportunidadesTab';
import { PerformanceTab } from './PerformanceTab';
import { ClientesTab } from './ClientesTab';
import { ProdutosAbcTab } from './ProdutosAbcTab';
import { PivotTable } from './PivotTable';
import { ValidacaoModal } from './ValidacaoModal';
import type { RelatoriosTab } from '../store/useRelatoriosStore';

const TABS: { id: RelatoriosTab; label: string }[] = [
  { id: 'oportunidades', label: 'Oportunidades por jogos' },
  { id: 'performance', label: 'Performance comercial' },
  { id: 'clientes', label: 'Base de clientes' },
  { id: 'margem', label: 'Margem e Lucratividade' },
  { id: 'abc', label: 'Curva ABC' },
  { id: 'pivot', label: 'Tabela Dinâmica' }
];

export function RelatoriosPilotPage() {
  const activeTab = useRelatoriosStore((s) => s.activeTab);
  const setActiveTab = useRelatoriosStore((s) => s.setActiveTab);
  const loading = useRelatoriosStore((s) => s.loading);
  const error = useRelatoriosStore((s) => s.error);

  return (
    <div className="w-full flex flex-col gap-8">
      <PageHeader
        kicker="Análise"
        title="Relatórios"
        description="Oportunidades por jogos, performance comercial e análise da base de clientes."
      />

      {error && <ErrorState title={error} compact />}

      <div className="flex items-center justify-start">
        <SegmentedControl
          options={TABS}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as RelatoriosTab)}
        />
      </div>

      {loading && <LoadingState title="Carregando relatórios…" compact />}

      {!loading && activeTab === 'oportunidades' && <OportunidadesTab />}
      {!loading && activeTab === 'performance' && <PerformanceTab />}
      {!loading && activeTab === 'clientes' && <ClientesTab />}
      {!loading && activeTab === 'margem' && <MargemTab />}
      {!loading && activeTab === 'abc' && <ProdutosAbcTab />}
      {!loading && activeTab === 'pivot' && <PivotTable />}

      <ValidacaoModal />
    </div>
  );
}
