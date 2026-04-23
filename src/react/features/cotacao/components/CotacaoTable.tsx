import { useCallback, useRef } from 'react';
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
  onToggleLock: () => void;
  onExportCsv: () => void;
};

export function CotacaoTable({
  produtos,
  fornecedores,
  precos,
  locked,
  onPriceChange,
  onToggleLock,
  onExportCsv
}: Props) {
  const debounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleInput = useCallback(
    (prodId: string, fornId: string, value: string) => {
      const key = `${prodId}_${fornId}`;
      const existing = debounceRef.current.get(key);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        onPriceChange(prodId, fornId, value);
        debounceRef.current.delete(key);
      }, 600);
      debounceRef.current.set(key, timer);
    },
    [onPriceChange]
  );

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
          <button type="button" className="btn btn-sm" onClick={onToggleLock}>
            {locked ? 'Destravar' : 'Travar'}
          </button>
        </div>
      </div>

      {locked && (
        <div className="alert al-a" style={{ marginBottom: 12 }}>
          Cotação travada | valores protegidos
        </div>
      )}

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
                    const bg = isBest
                      ? 'var(--gbg)'
                      : isWorst
                      ? 'var(--rbg)'
                      : undefined;
                    return (
                      <td
                        key={f.id}
                        style={{ textAlign: 'right', background: bg }}
                      >
                        {locked ? (
                          val !== null && val > 0 ? fmt(val) : '—'
                        ) : (
                          <input
                            className="inp cot-table-input"
                            type="number"
                            defaultValue={val !== null ? val.toFixed(2) : ''}
                            placeholder="0,00"
                            min="0"
                            step="0.01"
                            style={{ width: 90 }}
                            onChange={(e) => handleInput(p.id, f.id, e.target.value)}
                          />
                        )}
                      </td>
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
