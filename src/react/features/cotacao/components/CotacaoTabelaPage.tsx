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
          ? 'A cotação está travada. Edições bloqueadas até novo destravamento.'
          : 'Edição inline por célula com persistência imediata e recálculo automático dos comparativos.'
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
            <h3 className="rf-ui-section-title">Totais por fornecedor</h3>
            <CotacaoTotalsByFornecedor />
          </div>
        </>
      )}
    </FormSection>
  );
}
