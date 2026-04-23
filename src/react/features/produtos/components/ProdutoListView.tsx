import type { Produto } from '../../../../types/domain';
import type { ProdutoSaldo } from '../types';
import { markupToPrice } from '../hooks/useProdutoCalculations';

type Props = {
  filtrados: Produto[];
  todos: Produto[];
  saldos: Record<string, ProdutoSaldo>;
  totalCount: number;
  onDetalhe: (_id: string) => void;
  onEditar: (_id: string) => void;
  onMovimentar: (_id: string) => void;
  onRemover: (_id: string) => void;
};

type ItemOrdenado = {
  prod: Produto;
  isPai: boolean;
  isVariante: boolean;
};

function buildOrdem(filtrados: Produto[], todos: Produto[]): ItemOrdenado[] {
  const filtradosIds = new Set(filtrados.map((p) => p.id));
  const variantesMap: Record<string, Produto[]> = {};
  todos.forEach((p) => {
    if (p.produto_pai_id) {
      if (!variantesMap[p.produto_pai_id]) variantesMap[p.produto_pai_id] = [];
      variantesMap[p.produto_pai_id].push(p);
    }
  });

  const paiIds = new Set(
    filtrados.filter((p) => p.produto_pai_id).map((p) => p.produto_pai_id as string)
  );
  const paiIdsCarregados = new Set(todos.filter((p) => !p.produto_pai_id).map((p) => p.id));

  const pais = todos
    .filter((p) => !p.produto_pai_id && (filtradosIds.has(p.id) || paiIds.has(p.id)))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const result: ItemOrdenado[] = [];

  pais.forEach((p) => {
    const temFilhos = (variantesMap[p.id]?.length ?? 0) > 0;
    result.push({ prod: p, isPai: temFilhos, isVariante: false });
    (variantesMap[p.id] ?? [])
      .filter((v) => filtradosIds.has(v.id))
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((v) => result.push({ prod: v, isPai: false, isVariante: true }));
  });

  // variantes cujo pai não está carregado
  filtrados
    .filter((p) => p.produto_pai_id && !paiIdsCarregados.has(p.produto_pai_id))
    .forEach((p) => result.push({ prod: p, isPai: false, isVariante: true }));

  return result;
}

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtQ(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(3);
}

function StatusBadge({ saldo, emin }: { saldo: number; emin: number }) {
  if (saldo <= 0) return <span className="bdg br">Zerado</span>;
  if (emin > 0 && saldo < emin) return <span className="bdg ba">Baixo</span>;
  return <span className="bdg bg">OK</span>;
}

type RowActions = {
  onDetalhe: () => void;
  onMovimentar: () => void;
  onEditar: () => void;
  onRemover: () => void;
};

function ActionButtons({ onDetalhe, onMovimentar, onEditar, onRemover }: RowActions) {
  return (
    <div className="fg2 table-row-actions">
      <button className="btn btn-sm" onClick={onDetalhe}>Detalhes</button>
      <button className="btn btn-sm" onClick={onMovimentar}>Movimentar</button>
      <button className="btn btn-sm" onClick={onEditar}>Editar</button>
      <button className="btn btn-sm" onClick={onRemover}>Excluir</button>
    </div>
  );
}

function calcPrecos(p: Produto) {
  const custo = p.custo ?? 0;
  const mkv = p.mkv ?? 0;
  const mka = p.mka ?? 0;
  const pfa = p.pfa ?? 0;
  const varejo = mkv > 0 ? markupToPrice(custo, mkv) : 0;
  const atacado = pfa > 0 ? pfa : mka > 0 ? markupToPrice(custo, mka) : 0;
  return { varejo, atacado };
}

export function ProdutoListView({
  filtrados,
  todos,
  saldos,
  totalCount,
  onDetalhe,
  onEditar,
  onMovimentar,
  onRemover
}: Props) {
  if (filtrados.length === 0) {
    return (
      <div className="empty">
        <div className="ico">PR</div>
        <p>{totalCount ? 'Nenhum produto encontrado.' : 'Cadastre o primeiro produto desta filial.'}</p>
      </div>
    );
  }

  const ordenados = buildOrdem(filtrados, todos);

  return (
    <div className="tw">
      <table className="tbl">
        <thead>
          <tr>
            <th>Nome</th>
            <th>SKU</th>
            <th>Un</th>
            <th>Cat.</th>
            <th>Custo</th>
            <th>Varejo</th>
            <th>Atacado</th>
            <th>Saldo</th>
            <th>Min.</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ordenados.map(({ prod: p, isPai, isVariante }) => {
            const { varejo, atacado } = calcPrecos(p);
            const s = saldos[p.id] ?? { saldo: 0, cm: 0 };
            const emin = p.emin ?? 0;
            const mkv = p.mkv ?? 0;

            return (
              <tr
                key={p.id}
                style={isVariante ? { background: 'var(--bg2, rgba(0,0,0,0.02))' } : undefined}
              >
                <td style={{ fontWeight: isPai ? 700 : 600 }}>
                  {isVariante && (
                    <span style={{ color: 'var(--tx3)', paddingRight: 4 }}>↳</span>
                  )}
                  {p.nome}
                  {isPai && (
                    <span className="bdg bk" style={{ fontSize: 10, marginLeft: 6 }}>
                      Família
                    </span>
                  )}
                </td>
                <td style={{ color: 'var(--tx3)', fontSize: 12 }}>{p.sku || '-'}</td>
                <td>{p.un}</td>
                <td>
                  {p.cat ? <span className="bdg bk">{p.cat}</span> : '-'}
                </td>
                <td>{fmt(p.custo)}</td>
                <td>
                  {varejo > 0 ? (
                    <>
                      {fmt(varejo)}{' '}
                      <span className="bdg bb" style={{ fontSize: 10 }}>
                        {mkv.toFixed(0)}%
                      </span>
                    </>
                  ) : '-'}
                </td>
                <td>{atacado > 0 ? fmt(atacado) : '-'}</td>
                <td>
                  <span
                    style={{
                      fontWeight: 600,
                      color:
                        s.saldo <= 0
                          ? 'var(--r)'
                          : emin > 0 && s.saldo < emin
                            ? 'var(--a)'
                            : 'inherit'
                    }}
                  >
                    {fmtQ(s.saldo)} {p.un}
                  </span>
                </td>
                <td style={{ color: 'var(--tx2)' }}>
                  {emin > 0 ? fmtQ(emin) : '-'}
                </td>
                <td>
                  <ActionButtons
                    onDetalhe={() => onDetalhe(p.id)}
                    onMovimentar={() => onMovimentar(p.id)}
                    onEditar={() => onEditar(p.id)}
                    onRemover={() => onRemover(p.id)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ProdutoListMobile({
  filtrados,
  todos,
  saldos,
  totalCount,
  onDetalhe,
  onEditar,
  onMovimentar,
  onRemover
}: Props) {
  if (filtrados.length === 0) {
    return (
      <div className="empty">
        <div className="ico">PR</div>
        <p>{totalCount ? 'Nenhum produto encontrado.' : 'Cadastre o primeiro produto desta filial.'}</p>
      </div>
    );
  }

  const ordenados = buildOrdem(filtrados, todos);

  return (
    <div>
      {ordenados.map(({ prod: p, isPai, isVariante }) => {
        const { varejo, atacado } = calcPrecos(p);
        const s = saldos[p.id] ?? { saldo: 0, cm: 0 };
        const emin = p.emin ?? 0;
        const mkv = p.mkv ?? 0;

        return (
          <div
            key={p.id}
            className="mobile-card"
            style={
              isVariante
                ? { marginLeft: 16, borderLeft: '3px solid var(--b2)' }
                : undefined
            }
          >
            <div className="mobile-card-head">
              <div style={{ minWidth: 0 }}>
                <div className="mobile-card-title">
                  {isVariante && (
                    <span style={{ color: 'var(--tx3)', fontSize: 11 }}>↳ </span>
                  )}
                  {p.nome}
                  {isPai && (
                    <span className="bdg bk" style={{ fontSize: 10, marginLeft: 4 }}>
                      Família
                    </span>
                  )}
                </div>
                <div className="mobile-card-sub">
                  {p.sku || 'Sem SKU'}{p.cat ? ` - ${p.cat}` : ''}
                </div>
              </div>
              <StatusBadge saldo={s.saldo} emin={emin} />
            </div>

            <div className="mobile-card-meta">
              <div>Custo: <b style={{ color: 'var(--tx)' }}>{fmt(p.custo)}</b></div>
              <div>
                Varejo: <b style={{ color: 'var(--tx)' }}>{varejo > 0 ? fmt(varejo) : '-'}</b>{' '}
                {mkv > 0 && (
                  <span className="bdg bb" style={{ fontSize: 10 }}>{mkv.toFixed(0)}%</span>
                )}
              </div>
              <div>Atacado: <b style={{ color: 'var(--tx)' }}>{atacado > 0 ? fmt(atacado) : '-'}</b></div>
              <div>
                Saldo:{' '}
                <b style={{ color: s.saldo <= 0 ? 'var(--r)' : emin > 0 && s.saldo < emin ? 'var(--a)' : 'var(--tx)' }}>
                  {fmtQ(s.saldo)} {p.un}
                </b>
                {emin > 0 && ` - min. ${fmtQ(emin)}`}
              </div>
            </div>

            <div className="mobile-card-actions">
              <button className="btn btn-sm" onClick={() => onDetalhe(p.id)}>Detalhes</button>
              <button className="btn btn-sm" onClick={() => onMovimentar(p.id)}>Movimentar</button>
              <button className="btn btn-sm" onClick={() => onEditar(p.id)}>Editar</button>
              <button className="btn btn-sm" onClick={() => onRemover(p.id)}>Excluir</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
