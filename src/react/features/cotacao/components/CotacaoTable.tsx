import { memo, useEffect, useState } from 'react';
import { StatusBadge } from '../../../shared/ui';
import type { Fornecedor, PrecosMap } from '../types';
import type { Produto } from '../../../../types/domain';

function fmt(v: number) {
  return 'R$ ' + v.toFixed(2).replace('.', ',');
}

type Props = {
  produtos: Produto[];
  fornecedores: Fornecedor[];
  precos: PrecosMap;
  locked: boolean;
  onPriceChange: (prodId: string, fornId: string, value: string) => void;
  onExportCsv: () => void;
  savingCells?: Record<string, boolean>;
  errorCells?: Record<string, string | null>;
};

type PriceCellProps = {
  produtoId: string;
  fornecedorId: string;
  value: number | null;
  locked: boolean;
  isBest: boolean;
  isWorst: boolean;
  saving?: boolean;
  error?: string | null;
  onCommit: (prodId: string, fornId: string, value: string) => void;
};

function toInputValue(value: number | null) {
  return value != null && value > 0 ? value.toFixed(2) : '';
}

const CotacaoPriceCell = memo(function CotacaoPriceCell({
  produtoId,
  fornecedorId,
  value,
  locked,
  isBest,
  isWorst,
  saving = false,
  error = null,
  onCommit
}: PriceCellProps) {
  const [draft, setDraft] = useState(() => toInputValue(value));
  const [dirty, setDirty] = useState(false);
  const bg = isBest ? 'var(--gbg)' : isWorst ? 'var(--rbg)' : undefined;

  useEffect(() => {
    if (!dirty) {
      setDraft(toInputValue(value));
    }
  }, [dirty, value]);

  function commit() {
    if (locked) return;
    const normalizedCurrent = toInputValue(value);
    const normalizedDraft = draft.trim();
    if (normalizedDraft === normalizedCurrent) {
      setDirty(false);
      return;
    }
    setDirty(false);
    onCommit(produtoId, fornecedorId, normalizedDraft);
  }

  function cancel() {
    setDraft(toInputValue(value));
    setDirty(false);
  }

  return (
    <td
      style={{ textAlign: 'right', background: bg }}
      title={error || undefined}
    >
      {locked ? (
        value !== null && value > 0 ? (
          fmt(value)
        ) : (
          '—'
        )
      ) : (
        <input
          className={`inp cot-table-input${saving ? ' is-saving' : ''}${error ? ' is-error' : ''}`}
          type="number"
          value={draft}
          placeholder="0,00"
          min="0"
          step="0.01"
          onChange={(e) => {
            setDraft(e.target.value);
            setDirty(true);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.currentTarget as HTMLInputElement).blur();
            }
            if (e.key === 'Escape') {
              cancel();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
        />
      )}
    </td>
  );
});

export function CotacaoTable({
  produtos,
  fornecedores,
  precos,
  locked,
  onPriceChange,
  onExportCsv,
  savingCells = {},
  errorCells = {}
}: Props) {
  if (!produtos.length || !fornecedores.length) {
    return (
      <div className="rf-ui-empty">
        <p>Faltam dados para começar as compras.</p>
        <p className="table-cell-muted table-cell-caption">
          Cadastre produtos e fornecedores para comparar preços e melhor oferta.
        </p>
      </div>
    );
  }

  const fornTotals = fornecedores.map((f) => ({
    id: f.id,
    total: produtos.reduce((acc, p) => acc + (precos[p.id]?.[f.id] || 0), 0)
  }));
  const validTotals = fornTotals.filter((ft) => ft.total > 0).map((ft) => ft.total);
  const bestTotal = validTotals.length ? Math.min(...validTotals) : null;

  return (
    <div className="card-shell">
      <div className="rf-ui-section-header">
        <span className="table-cell-strong">Tabela de cotação</span>
        <div className="rf-ui-inline-actions">
          <button type="button" className="btn btn-sm" onClick={onExportCsv}>
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="tw" style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Un</th>
              {fornecedores.map((f) => (
                <th key={f.id} style={{ textAlign: 'right' }}>
                  {f.nome}
                </th>
              ))}
              <th style={{ textAlign: 'center' }}>Melhor</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p) => {
              const prices = fornecedores.map((f) => {
                const v = precos[p.id]?.[f.id];
                return v !== undefined && v > 0 ? v : null;
              });
              const valid = prices.filter((x): x is number => x !== null);
              const minP = valid.length ? Math.min(...valid) : null;
              const maxP = valid.length ? Math.max(...valid) : null;

              return (
                <tr key={p.id}>
                  <td className="table-cell-strong">{p.nome}</td>
                  <td className="table-cell-muted">{p.un}</td>
                  {fornecedores.map((f, fi) => {
                    const val = prices[fi];
                    const isBest = val !== null && val === minP && valid.length > 1;
                    const isWorst =
                      val !== null &&
                      val === maxP &&
                      valid.length > 1 &&
                      minP !== maxP;
                    return (
                      <CotacaoPriceCell
                        key={f.id}
                        produtoId={p.id}
                        fornecedorId={f.id}
                        value={val}
                        locked={locked}
                        isBest={isBest}
                        isWorst={isWorst}
                        saving={!!savingCells[`${p.id}:${f.id}`]}
                        error={errorCells[`${p.id}:${f.id}`]}
                        onCommit={onPriceChange}
                      />
                    );
                  })}
                  <td style={{ textAlign: 'center' }}>
                    {minP !== null ? (
                      <StatusBadge tone="success">{fmt(minP)}</StatusBadge>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={2} className="table-cell-muted">
                Total
              </td>
              {fornTotals.map((ft) => {
                const isBest =
                  ft.total > 0 && ft.total === bestTotal && validTotals.length > 1;
                return (
                  <td
                    key={ft.id}
                    className="table-cell-strong"
                    style={{
                      textAlign: 'right',
                      background: isBest ? 'var(--gbg)' : undefined
                    }}
                  >
                    {ft.total > 0 ? fmt(ft.total) : '—'}
                  </td>
                );
              })}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
