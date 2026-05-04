import type { Produto } from '../../../../types/domain';
import type { ProdutoSaldo } from '../types';
import { markupToPrice } from '../hooks/useProdutoCalculations';
import {
  ActionMenu,
  DataTable,
  EmptyState,
  StatusBadge,
  type DataTableColumn
} from '../../../shared/ui';

type Props = {
  produtos: Produto[];
  saldos: Record<string, ProdutoSaldo>;
  totalCount: number;
  hasFilters?: boolean;
  page: number;
  pageSize: number;
  onPageChange: (_page: number) => void;
  onPageSizeChange: (_pageSize: number) => void;
  onNovo: () => void;
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

type ProdutoRow = ItemOrdenado & {
  saldo: ProdutoSaldo;
};

function buildOrdem(produtos: Produto[]): ItemOrdenado[] {
  const filtradosIds = new Set(produtos.map((p) => p.id));
  const variantesMap: Record<string, Produto[]> = {};
  produtos.forEach((p) => {
    if (p.produto_pai_id) {
      if (!variantesMap[p.produto_pai_id]) variantesMap[p.produto_pai_id] = [];
      variantesMap[p.produto_pai_id].push(p);
    }
  });

  const paiIds = new Set(
    produtos.filter((p) => p.produto_pai_id).map((p) => p.produto_pai_id as string)
  );
  const paiIdsCarregados = new Set(produtos.filter((p) => !p.produto_pai_id).map((p) => p.id));

  const pais = produtos
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

  produtos
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

function stockTone(saldo: number, emin: number): 'danger' | 'warning' | 'success' {
  if (saldo <= 0) return 'danger';
  if (emin > 0 && saldo < emin) return 'warning';
  return 'success';
}

function stockLabel(saldo: number, emin: number): string {
  if (saldo <= 0) return 'Zerado';
  if (emin > 0 && saldo < emin) return 'Baixo';
  return 'OK';
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

function buildRows(produtos: Produto[], saldos: Record<string, ProdutoSaldo>): ProdutoRow[] {
  return buildOrdem(produtos).map((item) => ({
    ...item,
    saldo: saldos[item.prod.id] ?? { saldo: 0, cm: 0 }
  }));
}

function buildColumns(): Array<DataTableColumn<ProdutoRow>> {
  return [
    {
      key: 'nome',
      label: 'Produto',
      render: ({ prod, isPai, isVariante }) => (
        <div style={{ fontWeight: isPai ? 700 : 500 }}>
          {isVariante ? (
            <span style={{ color: 'var(--tx3)', paddingRight: 4 }} aria-hidden="true">
              ↳
            </span>
          ) : null}
          <span>{prod.nome}</span>
          {isPai ? (
            <span className="bdg bk" style={{ fontSize: 10, marginLeft: 6 }}>
              Família
            </span>
          ) : null}
        </div>
      )
    },
    {
      key: 'sku',
      label: 'SKU',
      render: ({ prod }) => <span className="table-cell-muted">{prod.sku || '—'}</span>
    },
    {
      key: 'categoria',
      label: 'Categoria',
      render: ({ prod }) => (prod.cat ? <span className="bdg bk">{prod.cat}</span> : '—')
    },
    {
      key: 'precos',
      label: 'Preços',
      render: ({ prod }) => {
        const { varejo, atacado } = calcPrecos(prod);
        return (
          <div className="rf-ui-stack" style={{ gap: 4 }}>
            <div className="table-cell-strong">{varejo > 0 ? fmt(varejo) : '—'}</div>
            <div className="table-cell-caption table-cell-muted">
              Atacado: {atacado > 0 ? fmt(atacado) : '—'}
            </div>
          </div>
        );
      }
    },
    {
      key: 'estoque',
      label: 'Estoque',
      render: ({ prod, saldo }) => {
        const emin = prod.emin ?? 0;
        return (
          <div className="rf-ui-stack" style={{ gap: 4 }}>
            <div className="table-cell-strong">
              {fmtQ(saldo.saldo)} {prod.un}
            </div>
            <div className="table-cell-caption table-cell-muted">
              Min. {emin > 0 ? `${fmtQ(emin)} ${prod.un}` : '—'}
            </div>
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: ({ prod, saldo }) => {
        const emin = prod.emin ?? 0;
        return (
          <StatusBadge tone={stockTone(saldo.saldo, emin)}>
            {stockLabel(saldo.saldo, emin)}
          </StatusBadge>
        );
      }
    }
  ];
}

export function ProdutoListView({
  produtos,
  saldos,
  totalCount,
  hasFilters,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onNovo,
  onDetalhe,
  onEditar,
  onMovimentar,
  onRemover
}: Props) {
  const rows = buildRows(produtos, saldos);
  const columns = buildColumns();

  return (
    <DataTable
      className="produtos-data-table"
      data={rows}
      rowKey={(row) => row.prod.id}
      page={page}
      pageSize={pageSize}
      total={totalCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      emptyTitle={
        hasFilters
          ? 'Nenhum produto encontrado com os filtros atuais.'
          : 'Nenhum produto cadastrado ainda.'
      }
      emptyDescription={
        hasFilters
          ? 'Ajuste os filtros ou limpe a busca para ampliar os resultados.'
          : 'Cadastre o primeiro produto desta filial para começar.'
      }
      emptyAction={
        <button className="btn btn-p btn-sm h-9" type="button" onClick={onNovo}>
          Novo produto
        </button>
      }
      onRowClick={(row) => onDetalhe(row.prod.id)}
      getRowClassName={(row) => (row.isVariante ? 'rf-ui-data-table__row--nested' : undefined)}
      columns={columns}
      renderActions={(row) => (
        <ActionMenu
          label="Ações do produto"
          buttonTestId={`produto-menu-${row.prod.id}`}
          items={[
            { key: 'detalhes', label: 'Ver detalhes', onClick: () => onDetalhe(row.prod.id) },
            { key: 'editar', label: 'Editar', onClick: () => onEditar(row.prod.id) },
            {
              key: 'movimentar',
              label: 'Movimentar estoque',
              onClick: () => onMovimentar(row.prod.id)
            },
            {
              key: 'remover',
              label: 'Excluir',
              danger: true,
              onClick: () => onRemover(row.prod.id)
            }
          ]}
        />
      )}
    />
  );
}

export function ProdutoListMobile({
  produtos,
  saldos,
  totalCount,
  hasFilters,
  page,
  pageSize,
  onPageChange,
  onNovo,
  onDetalhe,
  onEditar,
  onMovimentar,
  onRemover
}: Props) {
  if (produtos.length === 0) {
    return (
      <EmptyState
        title={
          hasFilters
            ? 'Nenhum produto encontrado com os filtros atuais.'
            : 'Nenhum produto cadastrado ainda.'
        }
        description={
          hasFilters
            ? 'Ajuste os filtros ou limpe a busca para ampliar os resultados.'
            : 'Cadastre o primeiro produto desta filial para começar.'
        }
        action={
          <button className="btn btn-p btn-sm h-9" type="button" onClick={onNovo}>
            Novo produto
          </button>
        }
      />
    );
  }

  const ordenados = buildOrdem(produtos);

  return (
    <div className="rf-ui-stack">
      {ordenados.map(({ prod: p, isPai, isVariante }) => {
        const { varejo, atacado } = calcPrecos(p);
        const s = saldos[p.id] ?? { saldo: 0, cm: 0 };
        const emin = p.emin ?? 0;

        return (
          <div
            key={p.id}
            className="mobile-card"
            style={isVariante ? { marginLeft: 16, borderLeft: '3px solid var(--b2)' } : undefined}
          >
            <div className="mobile-card-head">
              <div style={{ minWidth: 0 }}>
                <div className="mobile-card-title">
                  {isVariante ? (
                    <span style={{ color: 'var(--tx3)', fontSize: 11 }}>↳ </span>
                  ) : null}
                  {p.nome}
                  {isPai ? (
                    <span className="bdg bk" style={{ fontSize: 10, marginLeft: 4 }}>
                      Família
                    </span>
                  ) : null}
                </div>
                <div className="mobile-card-sub">
                  {p.sku || 'Sem SKU'}
                  {p.cat ? ` · ${p.cat}` : ''}
                </div>
              </div>
              <StatusBadge tone={stockTone(s.saldo, emin)}>{stockLabel(s.saldo, emin)}</StatusBadge>
            </div>

            <div className="mobile-card-meta">
              <div>
                Custo: <b style={{ color: 'var(--tx)' }}>{fmt(p.custo)}</b>
              </div>
              <div>
                Varejo: <b style={{ color: 'var(--tx)' }}>{varejo > 0 ? fmt(varejo) : '—'}</b>
              </div>
              <div>
                Atacado: <b style={{ color: 'var(--tx)' }}>{atacado > 0 ? fmt(atacado) : '—'}</b>
              </div>
              <div>
                Saldo:{' '}
                <b
                  style={{
                    color:
                      s.saldo <= 0
                        ? 'var(--r)'
                        : emin > 0 && s.saldo < emin
                          ? 'var(--a)'
                          : 'var(--tx)'
                  }}
                >
                  {fmtQ(s.saldo)} {p.un}
                </b>
                {emin > 0 ? ` · min. ${fmtQ(emin)}` : ''}
              </div>
            </div>

            <div className="mobile-card-actions" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-sm" onClick={() => onDetalhe(p.id)}>
                Detalhes
              </button>
              <ActionMenu
                label="Ações do produto"
                align="right"
                items={[
                  { key: 'editar', label: 'Editar', onClick: () => onEditar(p.id) },
                  {
                    key: 'movimentar',
                    label: 'Movimentar estoque',
                    onClick: () => onMovimentar(p.id)
                  },
                  { key: 'remover', label: 'Excluir', danger: true, onClick: () => onRemover(p.id) }
                ]}
              />
            </div>
          </div>
        );
      })}
      {totalCount > produtos.length ? (
        <div className="mobile-card">
          <div className="mobile-card-sub">
            Página {page} · {produtos.length} de {totalCount} produtos carregados
          </div>
          <div className="mobile-card-actions" style={{ justifyContent: 'space-between' }}>
            <button
              className="btn btn-sm"
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Anterior
            </button>
            <button
              className="btn btn-sm"
              type="button"
              disabled={page * pageSize >= totalCount}
              onClick={() => onPageChange(page + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
