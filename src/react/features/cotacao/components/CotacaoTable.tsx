import { memo, useEffect, useState } from 'react';
import { StatusBadge, Button } from '../../../shared/ui';
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
      className={`px-4 py-3 text-right transition-colors ${isBest ? 'bg-emerald-500/10' : isWorst ? 'bg-rose-500/10' : ''}`}
      title={error || undefined}
    >
      {locked ? (
        value !== null && value > 0 ? (
          <span className={`font-medium ${isBest ? 'text-emerald-700' : isWorst ? 'text-rose-700' : 'text-slate-900'}`}>
            {fmt(value)}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )
      ) : (
        <input
          className={`rf-input-premium !py-1 !px-2 !text-xs !h-7 !text-right ${saving ? 'opacity-50' : ''} ${error ? '!border-rose-500 !ring-rose-500' : ''} ${isBest ? '!bg-white' : ''}`}
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
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-900 m-0">Tabela de cotação</h4>
        <Button variant="secondary" size="sm" onClick={onExportCsv}>
          Exportar CSV
        </Button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-bold text-slate-700">Produto</th>
              <th className="px-4 py-3 text-left font-bold text-slate-700">Un</th>
              {fornecedores.map((f) => (
                <th key={f.id} className="px-4 py-3 text-right font-bold text-slate-700">
                  {f.nome}
                </th>
              ))}
              <th className="px-4 py-3 text-center font-bold text-slate-700">Melhor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {produtos.map((p) => {
              const prices = fornecedores.map((f) => {
                const v = precos[p.id]?.[f.id];
                return v !== undefined && v > 0 ? v : null;
              });
              const valid = prices.filter((x): x is number => x !== null);
              const minP = valid.length ? Math.min(...valid) : null;
              const maxP = valid.length ? Math.max(...valid) : null;

              return (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.nome}</td>
                  <td className="px-4 py-3 text-slate-500">{p.un}</td>
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
                  <td className="px-4 py-3 text-center">
                    {minP !== null ? (
                      <StatusBadge tone="success">{fmt(minP)}</StatusBadge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-slate-50/80 font-bold border-t border-slate-200">
              <td colSpan={2} className="px-4 py-4 text-slate-500 uppercase tracking-wider text-[10px]">
                Total Geral
              </td>
              {fornTotals.map((ft) => {
                const isBest =
                  ft.total > 0 && ft.total === bestTotal && validTotals.length > 1;
                return (
                  <td
                    key={ft.id}
                    className={`px-4 py-4 text-right ${isBest ? 'text-emerald-600' : 'text-slate-900'}`}
                  >
                    {ft.total > 0 ? fmt(ft.total) : <span className="text-slate-400">—</span>}
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
