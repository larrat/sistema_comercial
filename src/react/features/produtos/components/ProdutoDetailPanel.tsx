import type { Produto } from '../../../../types/domain';
import type { ProdutoSaldo } from '../types';
import { markupToPrice, priceToMargin } from '../hooks/useProdutoCalculations';

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
    <div className="prod-detail">
      <div className="prod-detail-head fb">
        <div>
          <div className="prod-detail-title">{p.nome}</div>
          <div className="prod-detail-sub">
            {p.sku || 'Sem SKU'}{p.cat ? ` - ${p.cat}` : ''}
          </div>
        </div>
        <div className="prod-detail-status">
          {s.saldo <= 0 ? (
            <span className="bdg br">Zerado</span>
          ) : emin > 0 && s.saldo < emin ? (
            <span className="bdg ba">Baixo</span>
          ) : (
            <span className="bdg bg">OK</span>
          )}
        </div>
      </div>

      <div className="prod-detail-grid">
        <div className="prod-detail-kpi">
          <div className="prod-detail-label">Custo</div>
          <div className="prod-detail-value">{fmt(custo)}</div>
        </div>
        <div className="prod-detail-kpi">
          <div className="prod-detail-label">Varejo</div>
          <div className="prod-detail-value">{varejo > 0 ? fmt(varejo) : '-'}</div>
          <div className="prod-detail-meta">
            {margemV > 0 ? `${margemV.toFixed(1)}% margem` : 'Sem regra'}
          </div>
        </div>
        <div className="prod-detail-kpi">
          <div className="prod-detail-label">Atacado</div>
          <div className="prod-detail-value">{atacado > 0 ? fmt(atacado) : '-'}</div>
          <div className="prod-detail-meta">
            {margemA > 0 ? `${margemA.toFixed(1)}% margem` : 'Sem regra'}
          </div>
        </div>
        <div className="prod-detail-kpi">
          <div className="prod-detail-label">Saldo</div>
          <div className="prod-detail-value">{fmtQ(s.saldo)} {p.un}</div>
          <div className="prod-detail-meta">
            {emin > 0 ? `Min. ${fmtQ(emin)}` : 'Sem mínimo'}
          </div>
        </div>
        <div className="prod-detail-kpi">
          <div className="prod-detail-label">Custo médio</div>
          <div className="prod-detail-value">{fmt(s.cm || p.ecm || custo)}</div>
        </div>
        <div className="prod-detail-kpi">
          <div className="prod-detail-label">Comercial</div>
          <div className="prod-detail-value">
            {(p.qtmin ?? 0) > 0 ? `${fmtQ(p.qtmin!)} un` : '-'}
          </div>
          <div className="prod-detail-meta">
            Desc. varejo {p.dv ?? 0}% · atacado {p.da ?? 0}%
          </div>
        </div>
      </div>

      {sortedHist.length > 0 && (
        <div className="panel prod-detail-section">
          <div className="pt">Oscilação de custo</div>
          <div className="tw">
            <table className="tbl prod-detail-table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Fornecedor</th>
                  <th>Preço</th>
                </tr>
              </thead>
              <tbody>
                {sortedHist.map((h, i) => (
                  <tr key={i}>
                    <td>{String(h.mes ?? '').split('-').reverse().join('/')}</td>
                    <td>{h.forn || '-'}</td>
                    <td>{fmt(h.preco ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="prod-detail-actions">
        <button className="btn" onClick={onFechar}>Fechar</button>
        <button className="btn" onClick={onMovimentar}>Movimentar</button>
        <button className="btn btn-p" onClick={onEditar}>Editar</button>
      </div>
    </div>
  );
}
