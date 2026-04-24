import { EmptyState, StatusBadge } from '../../../shared/ui';
import { useCotacaoStore } from '../store/useCotacaoStore';

export function ImportacaoResumo() {
  const importContext = useCotacaoStore((s) => s.importContext);
  const importResumo = useCotacaoStore((s) => s.importResumo);

  if (importResumo) {
    return (
      <div className="card-shell rf-ui-import-resumo">
        <div className="table-cell-strong" style={{ marginBottom: 4 }}>
          Último resumo disponível
        </div>
        {importResumo.status ? (
          <div style={{ marginBottom: 8 }}>
            <StatusBadge
              tone={
                importResumo.status === 'success'
                  ? 'success'
                  : importResumo.status === 'partial'
                    ? 'warning'
                    : 'danger'
              }
            >
              {importResumo.status === 'success'
                ? 'Sucesso'
                : importResumo.status === 'partial'
                  ? 'Falha parcial'
                  : 'Falhou'}
            </StatusBadge>
          </div>
        ) : null}
        <div className="rf-ui-inline-stats">
          <span>{importResumo.novos} novos</span>
          <span>{importResumo.atualizados} atualizados</span>
          {importResumo.ignorados > 0 && <span>{importResumo.ignorados} ignorados</span>}
          {importResumo.falhas > 0 && (
            <span style={{ color: 'var(--red)' }}>{importResumo.falhas} falhas</span>
          )}
        </div>
        {importResumo.itensProblematicos?.length ? (
          <p className="table-cell-caption table-cell-muted" style={{ marginTop: 8 }}>
            Itens problemáticos visíveis: {importResumo.itensProblematicos.length}
          </p>
        ) : null}
      </div>
    );
  }

  if (!importContext) {
    return (
      <EmptyState
        title="Nenhum arquivo analisado ainda."
        description="Selecione um fornecedor e envie uma planilha para abrir o fluxo assistido de importação no shell React."
        compact
      />
    );
  }

  const suggested = importContext.sheets[0];

  return (
    <div className="card-shell rf-ui-stack rf-ui-import-resumo">
      <div className="rf-ui-section-header">
        <span className="table-cell-strong">Leitura inicial pronta</span>
        <StatusBadge tone="info">{importContext.forn.nome}</StatusBadge>
      </div>
      <div className="rf-ui-inline-stats">
        <span>
          Arquivo: <strong>{importContext.filename}</strong>
        </span>
        <span>{importContext.sheets.length} aba(s) detectada(s)</span>
        {suggested ? <span>Sugestão: {suggested.name}</span> : null}
      </div>
      <p className="table-cell-caption table-cell-muted">
        O arquivo já foi lido e o mapeamento pode ser revisado antes da persistência em lote no fluxo React.
      </p>
    </div>
  );
}
