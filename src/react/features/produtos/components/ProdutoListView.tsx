import type { Produto } from '../../../../types/domain';
import type { ProdutoSaldo } from '../types';
import { markupToPrice } from '../hooks/useProdutoCalculations';
import {
  ActionMenu,
  DataTable,
  EmptyState,
  StatusBadge,
  Button,
  Badge
} from '../../../shared/ui';
import { Package, AlertTriangle } from 'lucide-react';
import type { StatusBadgeTone } from '../../../shared/ui/StatusBadge';

type Props = {
  produtos: Produto[];
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

function stockTone(saldo: number, emin: number): StatusBadgeTone {
  if (saldo <= 0) return 'danger';
  if (emin > 0 && saldo < emin) return 'warning';
  return 'info';
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

export function ProdutoListView({
  produtos,
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
  const rows = buildOrdem(produtos);

  return (
    <DataTable
      data={rows}
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
        <Button variant="primary" onClick={onNovo}>
          Novo produto
        </Button>
      }
      onRowClick={(row) => onDetalhe(row.prod.id)}
      columns={[
        {
          key: 'nome',
          label: 'Produto',
          sortable: true,
          render: (row) => (
            <div className={`flex items-center gap-2 ${row.isPai ? 'font-bold text-slate-100' : 'font-medium text-slate-300'}`}>
              {row.isVariante ? (
                <span className="text-slate-500 select-none" aria-hidden="true">
                  ↳
                </span>
              ) : null}
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                 {row.prod.foto_url ? (
                   <img src={row.prod.foto_url} alt={row.prod.nome} className="w-full h-full object-cover" />
                 ) : (
                   <Package size={14} className="text-slate-600" />
                 )}
              </div>
              <span className="truncate">{row.prod.nome}</span>
              {row.isPai ? (
                <Badge variant="slate" className="text-[10px]">
                  Família
                </Badge>
              ) : null}
              {row.isVariante && (!row.prod.genero || !row.prod.tamanho) && (
                <div 
                  className="flex items-center text-amber-500"
                  title="Dados de gênero ou tamanho ausentes (legado)"
                >
                  <AlertTriangle size={14} className="animate-pulse" />
                </div>
              )}
            </div>
          )
        },
        {
          key: 'sku',
          label: 'SKU',
          render: (row) => <span className="text-slate-400">{row.prod.sku || '—'}</span>
        },
        {
          key: 'categoria',
          label: 'Categoria',
          render: (row) => (row.prod.cat ? <Badge variant="slate">{row.prod.cat}</Badge> : '—')
        },
        {
          key: 'precos',
          label: 'Preços',
          render: (row) => {
            const { varejo, atacado } = calcPrecos(row.prod);
            return (
              <div className="flex flex-col gap-0.5">
                <div className="text-[15px] font-bold text-slate-100">
                  {varejo > 0 ? fmt(varejo) : '—'}
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  Atacado: {atacado > 0 ? fmt(atacado) : '—'}
                </div>
              </div>
            );
          }
        },
        {
          key: 'estoque',
          label: 'Estoque',
          render: (row) => {
            const emin = row.prod.emin ?? 0;
            const saldo = row.prod.esal ?? 0;
            return (
              <div className="flex flex-col gap-0.5">
                <div className="text-sm font-bold text-slate-100">
                  {fmtQ(saldo)} <span className="text-xs font-normal text-slate-500">{row.prod.un}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Mín: {emin > 0 ? `${fmtQ(emin)} ${row.prod.un}` : '—'}
                </div>
              </div>
            );
          }
        },
        {
          key: 'status',
          label: 'Status',
          render: (row) => {
            const emin = row.prod.emin ?? 0;
            const saldo = row.prod.esal ?? 0;
            return (
              <StatusBadge tone={stockTone(saldo, emin)}>
                {stockLabel(saldo, emin)}
              </StatusBadge>
            );
          }
        }
      ]}
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
          <Button variant="primary" onClick={onNovo}>
            Novo produto
          </Button>
        }
      />
    );
  }

  const ordenados = buildOrdem(produtos);

  return (
    <div className="rf-ui-stack">
      {ordenados.map(({ prod: p, isPai, isVariante }) => {
        const { varejo, atacado } = calcPrecos(p);
        const saldo = p.esal ?? 0;
        const emin = p.emin ?? 0;

        return (
          <div
            key={p.id}
            className="rf-card-premium p-4 flex flex-col gap-4 relative overflow-hidden"
            style={isVariante ? { marginLeft: 16, borderLeft: '4px solid #8B5CF6' } : { borderLeft: '4px solid #3B82F6' }}
          >
            <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
               <Package className="w-12 h-12" />
            </div>
            <div className="mobile-card-head">
              <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-lg">
                   {p.foto_url ? (
                     <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                   ) : (
                     <Package size={20} className="text-slate-600" />
                   )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="mobile-card-title truncate">
                    {isVariante ? (
                      <span style={{ color: 'var(--tx3)', fontSize: 11 }}>↳ </span>
                    ) : null}
                    {p.nome}
                    {isPai ? (
                      <Badge variant="slate" className="ml-1 text-[10px]">
                        Família
                      </Badge>
                    ) : null}
                    {isVariante && (!p.genero || !p.tamanho) && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[9px] font-black text-amber-500 uppercase">
                        <AlertTriangle size={10} /> Incompleto
                      </span>
                    )}
                  </div>
                  <div className="mobile-card-sub truncate">
                    {p.sku || 'Sem SKU'}
                    {p.cat ? ` · ${p.cat}` : ''}
                  </div>
                </div>
              </div>
              <StatusBadge tone={stockTone(saldo, emin)}>{stockLabel(saldo, emin)}</StatusBadge>
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
                      saldo <= 0
                        ? 'var(--r)'
                        : emin > 0 && saldo < emin
                          ? 'var(--a)'
                          : 'var(--tx)'
                  }}
                >
                  {fmtQ(saldo)} {p.un}
                </b>
                {emin > 0 ? ` · min. ${fmtQ(emin)}` : ''}
              </div>
            </div>

            <div className="mobile-card-actions" style={{ justifyContent: 'space-between' }}>
              <Button size="sm" onClick={() => onDetalhe(p.id)}>
                Detalhes
              </Button>
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
            <Button
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              disabled={page * pageSize >= totalCount}
              onClick={() => onPageChange(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
