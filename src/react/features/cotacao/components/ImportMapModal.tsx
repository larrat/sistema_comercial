import { useState } from 'react';
import { Modal } from '../../../shared/ui';
import { useCotacaoStore } from '../store/useCotacaoStore';
import { useCotacaoImport, autoDetectColumns } from '../hooks/useCotacaoImport';
import type { CotacaoMapaDraft } from '../types';

function detectarCabecalho(rows: Array<Array<string | number | null | undefined>>): number {
  for (let i = 0; i < Math.min(80, rows.length); i++) {
    const joined = rows[i].map((c) => String(c || '').toUpperCase()).join(' | ');
    if (
      joined.includes('DESCRIÇÃO') ||
      joined.includes('DESCRICAO') ||
      joined.includes('VALOR UN LIQ') ||
      joined.includes('PREÇO') ||
      joined.includes('PRECO')
    ) return i;
  }
  return 0;
}

export function ImportMapModal() {
  const open = useCotacaoStore((s) => s.importMapOpen);
  const ctx = useCotacaoStore((s) => s.importContext);
  const progress = useCotacaoStore((s) => s.importProgress);
  const resumo = useCotacaoStore((s) => s.importResumo);
  const closeImportMap = useCotacaoStore((s) => s.closeImportMap);
  const { confirmarImportacao } = useCotacaoImport();

  const sheets = ctx?.sheets ?? [];
  const [sheetIdx, setSheetIdx] = useState(0);

  const sheet = sheets[sheetIdx] ?? sheets[0];
  const rows = sheet?.rows ?? [];
  const startDetected = detectarCabecalho(rows);
  const detected = autoDetectColumns(rows, startDetected);

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const [draft, setDraft] = useState<CotacaoMapaDraft>({
    sheet: 0,
    nomeCol: detected.nomeCol,
    precoCol: detected.precoCol,
    catCol: detected.catCol,
    tabelaCol: detected.tabelaCol,
    descontoCol: detected.descontoCol,
    startLine: startDetected + 2,
    mes: mesAtual
  });
  const [confirming, setConfirming] = useState(false);

  const headers = autoDetectColumns(rows, detectarCabecalho(rows)).headers;
  const preview = rows.slice(draft.startLine - 1, draft.startLine + 4);

  const opts = headers.map((h) => (
    <option key={h.idx} value={h.idx}>
      {h.label}
    </option>
  ));
  const optsNone = [
    <option key="none" value={-1}>
      — não importar —
    </option>,
    ...opts
  ];

  async function handleConfirmar() {
    if (!ctx?.forn) return;
    setConfirming(true);
    try {
      await confirmarImportacao(ctx.forn, { ...draft, sheet: sheetIdx }, sheets);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Modal
      open={open}
      title={`Importar Cotação — ${ctx?.forn?.nome ?? ''}`}
      onClose={() => { if (!confirming) closeImportMap(); }}
      footer={
        !progress && !resumo ? (
          <>
            <button type="button" className="btn btn-sm" onClick={closeImportMap} disabled={confirming}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-p btn-sm"
              disabled={confirming}
              onClick={() => void handleConfirmar()}
            >
              {confirming ? 'Importando...' : 'Confirmar importação'}
            </button>
          </>
        ) : resumo ? (
          <button type="button" className="btn btn-p btn-sm" onClick={closeImportMap}>
            Fechar
          </button>
        ) : null
      }
    >
      <div className="rf-ui-stack">
        {progress ? (
          <div className="rf-ui-stack">
            <div className="table-cell-muted">{progress.msg}</div>
            <div style={{ background: 'var(--border)', borderRadius: 4, overflow: 'hidden', height: 8 }}>
              <div
                style={{
                  background: 'var(--accent)',
                  height: '100%',
                  width: `${progress.pct}%`,
                  transition: 'width 0.3s'
                }}
              />
            </div>
            <div className="table-cell-caption table-cell-muted">{progress.pct}%</div>
          </div>
        ) : resumo ? (
          <div className="rf-ui-stack">
            <div className="table-cell-strong">Importação concluída</div>
            <div className="rf-ui-metrics-band">
              <div className="card-shell" style={{ padding: '8px 12px' }}>
                <div className="table-cell-caption table-cell-muted">Novos</div>
                <div className="table-cell-strong">{resumo.novos}</div>
              </div>
              <div className="card-shell" style={{ padding: '8px 12px' }}>
                <div className="table-cell-caption table-cell-muted">Atualizados</div>
                <div className="table-cell-strong">{resumo.atualizados}</div>
              </div>
              <div className="card-shell" style={{ padding: '8px 12px' }}>
                <div className="table-cell-caption table-cell-muted">Ignorados</div>
                <div className="table-cell-strong">{resumo.ignorados}</div>
              </div>
              {resumo.falhas > 0 && (
                <div className="card-shell" style={{ padding: '8px 12px' }}>
                  <div className="table-cell-caption table-cell-muted">Falhas</div>
                  <div className="table-cell-strong" style={{ color: 'var(--red)' }}>{resumo.falhas}</div>
                </div>
              )}
            </div>
            {resumo.ignoradosExemplos.length > 0 && (
              <details>
                <summary className="table-cell-caption table-cell-muted" style={{ cursor: 'pointer' }}>
                  Ver exemplos ignorados ({resumo.ignoradosExemplos.length})
                </summary>
                <div className="tw" style={{ marginTop: 8 }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Linha</th>
                        <th>Nome</th>
                        <th>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumo.ignoradosExemplos.map((ex, i) => (
                        <tr key={i}>
                          <td>{ex.linha}</td>
                          <td>{ex.nome || '—'}</td>
                          <td className="table-cell-muted">{ex.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        ) : (
          <>
            <p className="table-cell-muted table-cell-caption">
              Arquivo: <strong>{ctx?.filename}</strong>
            </p>

            {sheets.length > 1 && (
              <label className="rf-ui-field">
                <span className="rf-ui-field__label">Aba da planilha</span>
                <select
                  className="inp sel"
                  value={sheetIdx}
                  onChange={(e) => setSheetIdx(Number(e.target.value))}
                >
                  {sheets.map((s, i) => (
                    <option key={i} value={i}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {preview.length > 0 && (
              <div className="tw" style={{ overflowX: 'auto', maxHeight: 140, fontSize: 12 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      {headers.map((h) => (
                        <th key={h.idx}>{h.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, ri) => (
                      <tr key={ri}>
                        {headers.map((h) => (
                          <td key={h.idx}>{String(r[h.idx] ?? '').substring(0, 30)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="rf-ui-form-grid">
              <label className="rf-ui-field">
                <span className="rf-ui-field__label">Mês da cotação</span>
                <input
                  className="inp"
                  type="month"
                  value={draft.mes}
                  onChange={(e) => setDraft((d) => ({ ...d, mes: e.target.value }))}
                />
              </label>
              <label className="rf-ui-field">
                <span className="rf-ui-field__label">Linha inicial dos dados</span>
                <input
                  className="inp"
                  type="number"
                  min="1"
                  value={draft.startLine}
                  onChange={(e) => setDraft((d) => ({ ...d, startLine: Number(e.target.value) }))}
                />
              </label>
            </div>

            <div className="rf-ui-form-grid">
              <label className="rf-ui-field">
                <span className="rf-ui-field__label">Coluna: Descrição/Nome *</span>
                <select
                  className="inp sel"
                  value={draft.nomeCol}
                  onChange={(e) => setDraft((d) => ({ ...d, nomeCol: Number(e.target.value) }))}
                >
                  {opts}
                </select>
              </label>
              <label className="rf-ui-field">
                <span className="rf-ui-field__label">Coluna: Preço Líquido *</span>
                <select
                  className="inp sel"
                  value={draft.precoCol}
                  onChange={(e) => setDraft((d) => ({ ...d, precoCol: Number(e.target.value) }))}
                >
                  {opts}
                </select>
              </label>
              <label className="rf-ui-field">
                <span className="rf-ui-field__label">Coluna: Categoria</span>
                <select
                  className="inp sel"
                  value={draft.catCol}
                  onChange={(e) => setDraft((d) => ({ ...d, catCol: Number(e.target.value) }))}
                >
                  {optsNone}
                </select>
              </label>
              <label className="rf-ui-field">
                <span className="rf-ui-field__label">Coluna: Preço Tabela</span>
                <select
                  className="inp sel"
                  value={draft.tabelaCol}
                  onChange={(e) => setDraft((d) => ({ ...d, tabelaCol: Number(e.target.value) }))}
                >
                  {optsNone}
                </select>
              </label>
              <label className="rf-ui-field">
                <span className="rf-ui-field__label">Coluna: % Desconto</span>
                <select
                  className="inp sel"
                  value={draft.descontoCol}
                  onChange={(e) => setDraft((d) => ({ ...d, descontoCol: Number(e.target.value) }))}
                >
                  {optsNone}
                </select>
              </label>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
