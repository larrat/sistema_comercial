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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex flex-col gap-6">
      <PageHeader
        kicker="Compras"
        title="Compras / Cotação"
        description="Comparação de compras por fornecedor, com grade editável e importação de planilha."
        meta={<StatusBadge tone="info">{filialId || 'Sem filial'}</StatusBadge>}
      />

      <CotacaoTabs activeTab={activeTab} />

      {status === 'loading' ? (
        <EmptyState title="Carregando módulo de compras..." compact />
      ) : null}

      {status === 'error' && error ? <EmptyState title={error} compact /> : null}

      {status !== 'loading' && activeTab === 'cotacao' ? <CotacaoTabelaPage /> : null}
      {status !== 'loading' && activeTab === 'fornecedores' ? <CotacaoFornecedoresPage /> : null}
      {status !== 'loading' && activeTab === 'importar' ? <CotacaoImportPage /> : null}
    </main>
  );
}
