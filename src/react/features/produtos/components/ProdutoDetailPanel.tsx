import type { Produto } from '../../../../types/domain';
import type { ProdutoSaldo } from '../types';
import { markupToPrice, priceToMargin } from '../hooks/useProdutoCalculations';
import { StatusBadge, Button } from '../../../shared/ui';

type Props = {
  produto: Produto;
  saldo: ProdutoSaldo;
  onFechar: () => void;
  onEditar: () => void;
  onMovimentar: () => void;
};

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtQ(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(3);
}

export function ProdutoDetailPanel({ produto: p, saldo: s, onFechar, onEditar, onMovimentar }: Props) {
  const custo = p.custo ?? 0;
  const mkv = p.mkv ?? 0;
  const mka = p.mka ?? 0;
  const pfa = p.pfa ?? 0;
  const varejo = mkv > 0 ? markupToPrice(custo, mkv) : 0;
  const atacado = pfa > 0 ? pfa : mka > 0 ? markupToPrice(custo, mka) : 0;
  const margemV = varejo > 0 ? priceToMargin(custo, varejo) : 0;
  const margemA = atacado > 0 ? priceToMargin(custo, atacado) : 0;
  const emin = p.emin ?? 0;

  const sortedHist = p.hist_cot
    ? [...p.hist_cot].sort((a, b) => String(b.mes ?? '').localeCompare(String(a.mes ?? '')))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight leading-none">{p.nome}</h2>
          <div className="text-sm font-medium text-slate-400 mt-2 flex items-center gap-2">
            <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-white/5">{p.sku || 'Sem SKU'}</span>
            {p.cat && <span className="text-slate-600">/</span>}
            <span>{p.cat}</span>
          </div>
        </div>
        <div>
          {s.saldo <= 0 ? (
            <StatusBadge tone="danger">Zerado</StatusBadge>
          ) : emin > 0 && s.saldo < emin ? (
            <StatusBadge tone="warning">Baixo</StatusBadge>
          ) : (
            <StatusBadge tone="success">OK</StatusBadge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Custo</div>
          <div className="text-lg font-extrabold text-white leading-none">{fmt(custo)}</div>
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Varejo</div>
          <div className="text-lg font-extrabold text-emerald-400 leading-none">{varejo > 0 ? fmt(varejo) : '-'}</div>
          <div className="text-[11px] font-medium text-emerald-400/70">
            {margemV > 0 ? `${margemV.toFixed(1)}% margem` : 'Sem regra'}
          </div>
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Atacado</div>
          <div className="text-lg font-extrabold text-blue-400 leading-none">{atacado > 0 ? fmt(atacado) : '-'}</div>
          <div className="text-[11px] font-medium text-blue-400/70">
            {margemA > 0 ? `${margemA.toFixed(1)}% margem` : 'Sem regra'}
          </div>
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Saldo em estoque</div>
          <div className="text-lg font-extrabold text-white leading-none">{fmtQ(s.saldo)} {p.un}</div>
          <div className="text-[11px] font-medium text-slate-400">
            {emin > 0 ? `Estoque mín: ${fmtQ(emin)}` : 'Sem mínimo'}
          </div>
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Custo médio</div>
          <div className="text-lg font-extrabold text-white leading-none">{fmt(s.cm || p.ecm || custo)}</div>
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Comercial</div>
          <div className="text-lg font-extrabold text-white leading-none">
            {(p.qtmin ?? 0) > 0 ? `${fmtQ(p.qtmin!)} un` : '-'}
          </div>
          <div className="text-[11px] font-medium text-slate-400">
            Desc: V {p.dv ?? 0}% · A {p.da ?? 0}%
          </div>
        </div>
      </div>

      {sortedHist.length > 0 && (
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full" />
            Oscilação de custo
          </h3>
          <div className="overflow-hidden border border-white/5 rounded-xl">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/5 text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                  <th className="px-4 py-3 text-left">Mês</th>
                  <th className="px-4 py-3 text-left">Fornecedor</th>
                  <th className="px-4 py-3 text-right">Preço</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedHist.map((h, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-300">{String(h.mes ?? '').split('-').reverse().join('/')}</td>
                    <td className="px-4 py-2.5 text-slate-400">{h.forn || '-'}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-white">{fmt(h.preco ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 justify-end mt-4 pt-6 border-t border-white/5">
        <Button onClick={onFechar}>Fechar</Button>
        <Button onClick={onMovimentar}>Movimentar</Button>
        <Button variant="primary" onClick={onEditar}>Editar</Button>
      </div>
    </div>
  );
}
