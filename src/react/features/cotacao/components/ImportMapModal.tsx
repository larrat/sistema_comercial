import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../shared/ui';
import { useCotacaoImport } from '../hooks/useCotacaoImport';
import { useCotacaoStore } from '../store/useCotacaoStore';
import type { CotacaoMapaDraft } from '../types';
import {
  autoDetectColumnsImportacao,
  buildDraftFromSheet,
  buildPreviewRows
} from '../utils/importMapping';

export function ImportMapModal() {
  const open = useCotacaoStore((s) => s.importMapOpen);
  const ctx = useCotacaoStore((s) => s.importContext);
  const progress = useCotacaoStore((s) => s.importProgress);
  const resumo = useCotacaoStore((s) => s.importResumo);
  const closeImportMap = useCotacaoStore((s) => s.closeImportMap);
  const { confirmarImportacao } = useCotacaoImport();

  const sheets = ctx?.sheets ?? [];
  const [sheetIdx, setSheetIdx] = useState(0);
  const [confirming, setConfirming] = useState(false);

  const sheet = sheets[sheetIdx] ?? sheets[0];
  const rows = sheet?.rows ?? [];
  const [draft, setDraft] = useState<CotacaoMapaDraft>(() =>
    buildDraftFromSheet(rows, ctx?.savedLayout, 0)
  );

  useEffect(() => {
    setSheetIdx(0);
    setConfirming(false);
  }, [ctx?.filename]);

  useEffect(() => {
    setDraft(buildDraftFromSheet(rows, ctx?.savedLayout, sheetIdx));
  }, [ctx?.savedLayout, rows, sheetIdx]);

  const headers = useMemo(
    () => autoDetectColumnsImportacao(rows, Math.max(0, draft.startLine - 2)).headers,
    [draft.startLine, rows]
  );
  const preview = useMemo(() => buildPreviewRows(rows, draft.startLine, 5), [draft.startLine, rows]);

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
      open={open && !!ctx}
      title={`Importar cotação — ${ctx?.forn?.nome ?? ''}`}
      onClose={() => {
        if (!confirming) closeImportMap();
      }}
      footer={
        progress ? null : resumo ? (
          <button type="button" className="btn btn-p btn-sm" onClick={closeImportMap}>
            Fechar
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-sm"
              onClick={closeImportMap}
              disabled={confirming}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-p btn-sm"
              onClick={() => void handleConfirmar()}
              disabled={confirming || !ctx}
            >
              {confirming ? 'Importando...' : 'Confirmar importação'}
            </button>
          </>
        )
      }
    >
      <div className="rf-ui-stack">
        {progress ? (
          <div className="rf-ui-stack">
            <div className="table-cell-strong">Importação em andamento</div>
            <div className="table-cell-muted">{progress.msg}</div>
            <div
              style={{
                background: 'var(--border)',
                borderRadius: 4,
                overflow: 'hidden',
                height: 8
              }}
            >
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
            <div className="rf-ui-inline-stats">
              <span>{resumo.novos} novos</span>
              <span>{resumo.atualizados} atualizados</span>
              <span>{resumo.ignorados} ignorados</span>
              {resumo.falhas > 0 ? (
                <span style={{ color: 'var(--red)' }}>{resumo.falhas} falhas</span>
              ) : null}
            </div>
            {resumo.ignoradosExemplos.length ? (
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
                      {resumo.ignoradosExemplos.map((ex, index) => (
                        <tr key={`${ex.linha}-${index}`}>
                          <td>{ex.linha}</td>
                          <td>{ex.nome || '—'}</td>
                          <td className="table-cell-muted">{ex.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : null}
          </div>
        ) : (
          <>
            <div className="card-shell rf-ui-import-placeholder">
              <div className="table-cell-strong">Mapeamento assistido</div>
              <p className="table-cell-caption table-cell-muted">
                Revise a aba sugerida, ajuste colunas e valide a prévia antes da gravação em lote.
              </p>
            </div>

            <p className="table-cell-muted table-cell-caption">
              Arquivo: <strong>{ctx?.filename}</strong>
            </p>

            <div className="rf-ui-inline-stats">
              <span>
                Aba ativa: <strong>{sheet?.name || '—'}</strong>
              </span>
              <span>
                Linhas em preview: <strong>{preview.length}</strong>
              </span>
              <span>
                Layout salvo: <strong>{ctx?.savedLayout ? 'Sim' : 'Não'}</strong>
              </span>
            </div>

            {sheets.length > 1 ? (
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
            ) : null}

            {preview.length > 0 ? (
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
                    {preview.map((row, ri) => (
                      <tr key={ri}>
                        {headers.map((h) => (
                          <td key={h.idx}>{String(row[h.idx] ?? '').substring(0, 30)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

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
