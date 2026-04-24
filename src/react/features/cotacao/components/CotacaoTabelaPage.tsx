import { EmptyState, FormSection } from '../../../shared/ui';
import { useCotacaoTabela } from '../hooks/useCotacaoTabela';
import { useCotacaoStore } from '../store/useCotacaoStore';
import { CotacaoLockBanner } from './CotacaoLockBanner';
import { CotacaoMetricsReadOnly } from './CotacaoMetricsReadOnly';
import { CotacaoTable } from './CotacaoTable';
import { CotacaoTotalsByFornecedor } from './CotacaoTotalsByFornecedor';

export function CotacaoTabelaPage() {
  const status = useCotacaoStore((s) => s.status);
  const {
    produtos,
    fornecedores,
    precos,
    locked,
    atualizarPreco,
    toggleLock,
    lockSaving,
    exportCsv,
    savingCells,
    errorCells
  } = useCotacaoTabela();

  return (
    <FormSection
      title="Tabela de cotação"
      description={
        locked
          ? 'A cotacao esta travada. A grade React permanece auditavel em leitura e bloqueia alteracoes ate novo destravamento.'
          : 'Grade principal roda no shell React com edicao inline por celula, persistencia imediata e recalculo automatico dos comparativos.'
      }
    >
      {status === 'loading' ? (
        <EmptyState
          title="Carregando comparação de compras..."
          description="Estamos reunindo produtos, fornecedores, preços atuais e configuração mínima da cotação."
          compact
        />
        ) : (
        <>
          <CotacaoMetricsReadOnly />
          <CotacaoLockBanner onToggleLock={() => void toggleLock()} saving={lockSaving} />
          <CotacaoTable
            produtos={produtos}
            fornecedores={fornecedores}
            precos={precos}
            locked={locked}
            onPriceChange={atualizarPreco}
            onExportCsv={exportCsv}
            savingCells={savingCells}
            errorCells={errorCells}
          />
          <div className="rf-ui-stack">
            <div>
              <h3 className="rf-ui-section-title">Totais por fornecedor</h3>
              <p className="table-cell-caption table-cell-muted">
                Resumo consolidado para leitura rápida da comparação atual, sem edição inline nesta fase.
              </p>
            </div>
            <CotacaoTotalsByFornecedor />
          </div>
        </>
      )}
    </FormSection>
  );
}
