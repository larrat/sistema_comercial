import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../shared/ui';
import { useCotacaoImport } from '../hooks/useCotacaoImport';
import {
  buildCotacaoImportMatchReview,
  buildCotacaoImportPlan
} from '../services/cotacaoImportService';
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
  const produtos = useCotacaoStore((s) => s.produtos);
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
  const importPlan = useMemo(
    () => buildCotacaoImportPlan({ ...draft, sheet: sheetIdx }, sheet),
    [draft, sheet, sheetIdx]
  );
  const matchReview = useMemo(
    () => buildCotacaoImportMatchReview(importPlan.rows, produtos),
    [importPlan.rows, produtos]
  );

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
              disabled={confirming || !ctx || matchReview.blocking > 0}
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
            {resumo.status ? (
              <div>
                <span
                  className={`bdg ${
                    resumo.status === 'success'
                      ? 'ok'
                      : resumo.status === 'partial'
                        ? 'warn'
                        : 'danger'
                  }`}
                >
                  {resumo.status === 'success'
                    ? 'Sucesso'
                    : resumo.status === 'partial'
                      ? 'Falha parcial'
                      : 'Falhou'}
                </span>
              </div>
            ) : null}
            <div className="rf-ui-inline-stats">
              <span>{resumo.novos} novos</span>
              <span>{resumo.atualizados} atualizados</span>
              <span>{resumo.ignorados} ignorados</span>
              {resumo.falhas > 0 ? (
                <span style={{ color: 'var(--red)' }}>{resumo.falhas} falhas</span>
              ) : null}
            </div>
            {resumo.etapas?.length ? (
              <div className="tw">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Etapa</th>
                      <th>Status</th>
                      <th>Processados</th>
                      <th>Sucesso</th>
                      <th>Falhas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.etapas.map((etapa) => (
                      <tr key={etapa.id}>
                        <td>{etapa.label}</td>
                        <td>
                          {etapa.status === 'success'
                            ? 'Sucesso'
                            : etapa.status === 'partial'
                              ? 'Parcial'
                              : 'Falhou'}
                        </td>
                        <td>{etapa.processados}</td>
                        <td>{etapa.sucesso}</td>
                        <td>{etapa.falhas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
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
            {resumo.itensProblematicos?.length ? (
              <details>
                <summary className="table-cell-caption table-cell-muted" style={{ cursor: 'pointer' }}>
                  Ver itens problemáticos ({resumo.itensProblematicos.length})
                </summary>
                <div className="tw" style={{ marginTop: 8 }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Etapa</th>
                        <th>Item</th>
                        <th>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumo.itensProblematicos.map((item, index) => (
                        <tr key={`${item.etapa}-${item.nome}-${index}`}>
                          <td>{item.etapa}</td>
                          <td>{item.nome || '—'}</td>
                          <td className="table-cell-muted">{item.motivo}</td>
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

            <div className="card-shell rf-ui-stack">
              <div className="table-cell-strong">Política de mapeamento de produtos</div>
              <div className="rf-ui-inline-stats">
                <span>Confiáveis: <strong>{matchReview.matched}</strong></span>
                <span>Ambíguos: <strong>{matchReview.ambiguous}</strong></span>
                <span>Sem match: <strong>{matchReview.unmatched}</strong></span>
              </div>
              <p className="table-cell-caption table-cell-muted">
                Só itens com match confiável seguem para a persistência. Match ambíguo ou sem match
                bloqueiam a confirmação para evitar associação incorreta.
              </p>
              {matchReview.blocking > 0 ? (
                <div className="table-cell-caption" style={{ color: 'var(--red)' }}>
                  Há {matchReview.blocking} item(ns) com mapeamento inseguro. Revise antes de importar.
                </div>
              ) : (
                <div className="table-cell-caption table-cell-muted">
                  Todos os itens válidos estão mapeados com segurança.
                </div>
              )}
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

            {importPlan.rows.length ? (
              <details>
                <summary className="table-cell-caption table-cell-muted" style={{ cursor: 'pointer' }}>
                  Revisar matching dos itens ({matchReview.rows.length})
                </summary>
                <div className="tw" style={{ marginTop: 8 }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Item importado</th>
                        <th>Status</th>
                        <th>Produto relacionado</th>
                        <th>Detalhe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchReview.rows.slice(0, 20).map((row, index) => (
                        <tr key={`${row.nomeOriginal}-${index}`}>
                          <td>{row.nomeOriginal}</td>
                          <td>
                            {row.status === 'matched'
                              ? 'Confiável'
                              : row.status === 'ambiguous'
                                ? 'Ambíguo'
                                : 'Sem match'}
                          </td>
                          <td>{row.produtoNome || '—'}</td>
                          <td className="table-cell-muted">
                            {row.status === 'ambiguous'
                              ? row.candidatos?.join(', ') || 'Mais de um candidato'
                              : row.status === 'unmatched'
                                ? 'Nenhum produto existente bateu com segurança'
                                : 'Match único por nome/descrição padronizada'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
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
