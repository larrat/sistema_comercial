import { EmptyState, PageHeader, StatusBadge } from '../../../shared/ui';
import { useFilialContext } from '../../../app/filial/FilialProvider';
import { useCotacaoStore } from '../store/useCotacaoStore';
import type { CotacaoTabId } from '../types';
import { CotacaoFornecedoresPage } from './CotacaoFornecedoresPage';
import { CotacaoImportPage } from './CotacaoImportPage';
import { CotacaoTabelaPage } from './CotacaoTabelaPage';
import { CotacaoTabs } from './CotacaoTabs';

type Props = {
  activeTab: CotacaoTabId;
};

export function CotacaoPage({ activeTab }: Props) {
  const { filialId } = useFilialContext();
  const status = useCotacaoStore((s) => s.status);
  const error = useCotacaoStore((s) => s.error);

  return (
    <main className="rf-content rf-ui-stack">
      <PageHeader
        kicker="Compras"
        title="Compras / Cotação"
        description="Entrada React criada para migrar o módulo em subfluxos: grade, fornecedores e só depois importação."
        meta={<StatusBadge tone="info">{filialId || 'Sem filial'}</StatusBadge>}
      />

      <CotacaoTabs activeTab={activeTab} />

      {status === 'loading' ? (
        <EmptyState
          title="Preparando o módulo de compras..."
          description="A rota React já está ativa e a data layer inicial está sendo conectada com segurança."
          compact
        />
      ) : null}

      {status === 'error' && error ? <EmptyState title={error} compact /> : null}

      {status !== 'loading' && activeTab === 'cotacao' ? <CotacaoTabelaPage /> : null}
      {status !== 'loading' && activeTab === 'fornecedores' ? <CotacaoFornecedoresPage /> : null}
      {status !== 'loading' && activeTab === 'importar' ? <CotacaoImportPage /> : null}
    </main>
  );
}
