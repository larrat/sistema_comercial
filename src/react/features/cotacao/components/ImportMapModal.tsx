import { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Input, Select, Badge } from '../../../shared/ui';
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
          <Button variant="primary" onClick={closeImportMap}>
            Fechar
          </Button>
        ) : (
          <>
            <Button
              onClick={closeImportMap}
              disabled={confirming}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleConfirmar()}
              loading={confirming}
              disabled={!ctx || matchReview.blocking > 0}
            >
              Confirmar importação
            </Button>
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
              <div className="flex gap-2">
                <Badge
                  variant={
                    resumo.status === 'success'
                      ? 'green'
                      : resumo.status === 'partial'
                        ? 'yellow'
                        : 'red'
                  }
                >
                  {resumo.status === 'success'
                    ? 'Sucesso'
                    : resumo.status === 'partial'
                      ? 'Falha parcial'
                      : 'Falhou'}
                </Badge>
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
              <div className="overflow-hidden border border-white/5 rounded-xl bg-slate-900">
                <table className="w-full text-[12px] border-collapse">
                  <thead className="bg-white/5 border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Etapa</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Proc.</th>
                      <th className="px-4 py-3 text-right">Sucesso</th>
                      <th className="px-4 py-3 text-right">Falhas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {resumo.etapas.map((etapa) => (
                      <tr key={etapa.id} className="hover:bg-white/5">
                        <td className="px-4 py-2.5 font-medium text-white">{etapa.label}</td>
                        <td className="px-4 py-2.5">
                           <Badge variant={etapa.status === 'success' ? 'green' : etapa.status === 'partial' ? 'yellow' : 'red'}>
                            {etapa.status === 'success' ? 'Sucesso' : etapa.status === 'partial' ? 'Parcial' : 'Falhou'}
                           </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right text-white">{etapa.processados}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-400">{etapa.sucesso}</td>
                        <td className="px-4 py-2.5 text-right text-rose-400 font-bold">{etapa.falhas}</td>
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
                <div className="mt-2 overflow-hidden border border-white/5 rounded-lg bg-white/5">
                  <table className="w-full text-[11px] border-collapse">
                    <thead className="bg-white/5 border-b border-white/5 text-slate-400 font-bold uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Linha</th>
                        <th className="px-3 py-2 text-left">Nome</th>
                        <th className="px-3 py-2 text-left">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {resumo.ignoradosExemplos.map((ex, index) => (
                        <tr key={`${ex.linha}-${index}`}>
                          <td className="px-3 py-1.5 text-white">{ex.linha}</td>
                          <td className="px-3 py-1.5 font-medium text-white">{ex.nome || '—'}</td>
                          <td className="px-3 py-1.5 text-slate-400 italic">{ex.motivo}</td>
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
                <div className="mt-2 overflow-hidden border border-white/5 rounded-lg bg-white/5">
                  <table className="w-full text-[11px] border-collapse">
                    <thead className="bg-white/5 border-b border-white/5 text-slate-400 font-bold uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Etapa</th>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-left">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {resumo.itensProblematicos.map((item, index) => (
                        <tr key={`${item.etapa}-${item.nome}-${index}`}>
                          <td className="px-3 py-1.5 font-medium text-white">{item.etapa}</td>
                          <td className="px-3 py-1.5 text-white">{item.nome || '—'}</td>
                          <td className="px-3 py-1.5 text-rose-400">{item.motivo}</td>
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
            <Select
              label="Aba da planilha"
              value={sheetIdx}
              onChange={(e) => setSheetIdx(Number(e.target.value))}
              options={sheets.map((s, i) => ({ value: i, label: s.name }))}
            />
            ) : null}

            {preview.length > 0 ? (
              <div className="overflow-hidden border border-white/5 rounded-xl bg-slate-900 shadow-sm max-h-[160px] overflow-y-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead className="bg-white/5 border-b border-white/5 text-slate-400 font-bold uppercase sticky top-0 z-10">
                    <tr>
                      {headers.map((h) => (
                        <th key={h.idx} className="px-3 py-2 text-left whitespace-nowrap">{h.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {preview.map((row, ri) => (
                      <tr key={ri} className="hover:bg-white/5">
                        {headers.map((h) => (
                          <td key={h.idx} className="px-3 py-1.5 text-slate-300 truncate max-w-[120px]">
                            {String(row[h.idx] ?? '').substring(0, 30)}
                          </td>
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
                <div className="mt-3 overflow-hidden border border-white/5 rounded-xl bg-slate-900 shadow-sm max-h-[200px] overflow-y-auto">
                  <table className="w-full text-[11px] border-collapse">
                    <thead className="bg-white/5 border-b border-white/5 text-slate-400 font-bold uppercase sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Item importado</th>
                        <th className="px-4 py-2.5 text-left">Status</th>
                        <th className="px-4 py-2.5 text-left">Produto relacionado</th>
                        <th className="px-4 py-2.5 text-left">Detalhe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                    {matchReview.rows.slice(0, 20).map((row, index) => (
                      <tr key={`${row.nomeOriginal}-${index}`} className="hover:bg-white/5">
                        <td className="px-4 py-2.5 font-medium text-white">{row.nomeOriginal}</td>
                          <td className="px-4 py-2.5">
                             <Badge variant={row.status === 'matched' ? 'green' : row.status === 'ambiguous' ? 'yellow' : 'red'}>
                                {row.status === 'matched' ? 'Confiável' : row.status === 'ambiguous' ? 'Ambíguo' : 'Sem match'}
                             </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-slate-300">{row.produtoNome || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-400 italic">
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
              <Input
                label="Mês da cotação"
                type="month"
                value={draft.mes}
                onChange={(e) => setDraft((d) => ({ ...d, mes: e.target.value }))}
              />
              <Input
                label="Linha inicial dos dados"
                type="number"
                min="1"
                value={draft.startLine}
                onChange={(e) => setDraft((d) => ({ ...d, startLine: Number(e.target.value) }))}
              />
            </div>

            <div className="rf-ui-form-grid">
              <Select
                label="Coluna: Descrição/Nome *"
                value={draft.nomeCol}
                onChange={(e) => setDraft((d) => ({ ...d, nomeCol: Number(e.target.value) }))}
                options={headers.map(h => ({ value: h.idx, label: h.label }))}
              />
              <Select
                label="Coluna: Preço Líquido *"
                value={draft.precoCol}
                onChange={(e) => setDraft((d) => ({ ...d, precoCol: Number(e.target.value) }))}
                options={headers.map(h => ({ value: h.idx, label: h.label }))}
              />
              <Select
                label="Coluna: Categoria"
                value={draft.catCol}
                onChange={(e) => setDraft((d) => ({ ...d, catCol: Number(e.target.value) }))}
                options={[{ value: -1, label: '— não importar —' }, ...headers.map(h => ({ value: h.idx, label: h.label }))]}
              />
              <Select
                label="Coluna: Preço Tabela"
                value={draft.tabelaCol}
                onChange={(e) => setDraft((d) => ({ ...d, tabelaCol: Number(e.target.value) }))}
                options={[{ value: -1, label: '— não importar —' }, ...headers.map(h => ({ value: h.idx, label: h.label }))]}
              />
              <Select
                label="Coluna: % Desconto"
                value={draft.descontoCol}
                onChange={(e) => setDraft((d) => ({ ...d, descontoCol: Number(e.target.value) }))}
                options={[{ value: -1, label: '— não importar —' }, ...headers.map(h => ({ value: h.idx, label: h.label }))]}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
