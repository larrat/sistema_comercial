import { useEffect, useMemo, useState } from 'react';

import type { MovimentoEstoque, Produto } from '../../../../types/domain';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { ChartCard, SystemBarChart } from '../../../app/components/charts';
import { EmptyState, ErrorState, StatusBadge } from '../../../shared/ui';
import { markupToPrice } from '../hooks/useProdutoCalculations';
import {
  listMovimentacoesByProdutoIds,
  listPedidoItensByProdutoIds,
  listVariantesByPaiId,
  type VendaVarianteRow
} from '../services/produtosApi';

const PERIODOS = [30, 90, 365] as const;
type Periodo = (typeof PERIODOS)[number];

const PERIODO_LABELS: Record<Periodo, string> = {
  30: '30 dias',
  90: '90 dias',
  365: '12 meses'
};

function getFromDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function calcSaldos(variantes: Produto[], movs: MovimentoEstoque[]): Record<string, number> {
  const map: Record<string, number> = {};
  variantes.forEach((p) => {
    map[p.id] = Number(p.esal ?? 0);
  });
  [...movs]
    .sort((a, b) => Number(a.ts ?? 0) - Number(b.ts ?? 0))
    .forEach((m) => {
      const id = m.prodId ?? m.prod_id;
      if (!id || !(id in map)) return;
      if (m.tipo === 'entrada') map[id] += Number(m.qty ?? 0);
      else if (m.tipo === 'saida' || m.tipo === 'transf') map[id] -= Number(m.qty ?? 0);
      else if (m.tipo === 'ajuste') map[id] = Number(m.saldo_real ?? m.saldoReal ?? 0);
    });
  return map;
}

function aggregateVendas(
  variantes: Produto[],
  vendas: VendaVarianteRow[]
): Record<string, { qty: number; receita: number }> {
  const map: Record<string, { qty: number; receita: number }> = {};
  variantes.forEach((p) => {
    map[p.id] = { qty: 0, receita: 0 };
  });
  vendas.forEach((v) => {
    if (v.produto_id in map) {
      map[v.produto_id].qty += Number(v.qty ?? 0);
      map[v.produto_id].receita += Number(v.qty ?? 0) * Number(v.preco ?? 0);
    }
  });
  return map;
}

function shortName(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  return parts[parts.length - 1] ?? nome;
}

function fmtQ(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(3);
}

function fmtCurrency(v: number): string {
  return Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
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

type Props = {
  produto: Produto;
};

export function ProdutoVariantesTab({ produto }: Props) {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);

  const [variantes, setVariantes] = useState<Produto[]>([]);
  const [movs, setMovs] = useState<MovimentoEstoque[]>([]);
  const [vendas, setVendas] = useState<VendaVarianteRow[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>(90);
  const [loading, setLoading] = useState(true);
  const [loadingVendas, setLoadingVendas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const config = getSupabaseConfig();
    if (!config.ready || !session?.access_token || !filialId) return;
    const ctx = { url: config.url, key: config.key, token: session.access_token, filialId };
    let cancelled = false;
    setLoading(true);
    setError(null);

    void listVariantesByPaiId(ctx, produto.id)
      .then(async (rows) => {
        if (cancelled) return;
        setVariantes(rows);
        if (rows.length) {
          const ids = rows.map((v) => v.id);
          const movimentacoes = await listMovimentacoesByProdutoIds(ctx, ids);
          if (!cancelled) setMovs(movimentacoes);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Erro ao carregar variantes.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [produto.id, session?.access_token, filialId]);

  useEffect(() => {
    if (!variantes.length) return;
    const config = getSupabaseConfig();
    if (!config.ready || !session?.access_token || !filialId) return;
    const ctx = { url: config.url, key: config.key, token: session.access_token, filialId };
    let cancelled = false;
    setLoadingVendas(true);

    void listPedidoItensByProdutoIds(ctx, variantes.map((v) => v.id), getFromDate(periodo))
      .then((rows) => {
        if (cancelled) return;
        setVendas(rows);
        setLoadingVendas(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadingVendas(false);
      });

    return () => {
      cancelled = true;
    };
  }, [variantes, periodo, session?.access_token, filialId]);

  const saldos = useMemo(() => calcSaldos(variantes, movs), [variantes, movs]);
  const vendaAgg = useMemo(() => aggregateVendas(variantes, vendas), [variantes, vendas]);

  const estoqueData = useMemo(
    () =>
      variantes.map((v) => ({
        nome: shortName(v.nome),
        saldo: Math.max(0, saldos[v.id] ?? 0)
      })),
    [variantes, saldos]
  );

  const vendasData = useMemo(
    () =>
      variantes.map((v) => ({
        nome: shortName(v.nome),
        qty: vendaAgg[v.id]?.qty ?? 0,
        receita: vendaAgg[v.id]?.receita ?? 0
      })),
    [variantes, vendaAgg]
  );

  const periodSelector = (
    <div style={{ display: 'flex', gap: 4 }}>
      {PERIODOS.map((p) => (
        <button
          key={p}
          type="button"
          className={`btn btn-sm${periodo === p ? ' btn-p' : ''}`}
          onClick={() => setPeriodo(p)}
          disabled={loadingVendas}
        >
          {PERIODO_LABELS[p]}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <section className="rf-cliente-profile__card">
        <p className="table-cell-muted">Carregando variantes...</p>
      </section>
    );
  }

  if (error) {
    return <ErrorState title={error} compact />;
  }

  if (!variantes.length) {
    return (
      <EmptyState
        title="Nenhuma variante cadastrada."
        description="Cadastre produtos com este como produto-pai para criar variantes."
        compact
      />
    );
  }

  return (
    <div className="rf-ui-stack">
      <section className="rf-cliente-profile__card">
        <div className="rf-cliente-profile__card-head">
          <h3 className="rf-cliente-profile__card-title">
            Variantes ({variantes.length})
          </h3>
        </div>
        <div className="rf-cliente-profile__table-wrap">
          <table className="rf-cliente-profile__table">
            <thead>
              <tr>
                <th>Variante</th>
                <th>SKU</th>
                <th>Saldo atual</th>
                <th>Varejo</th>
                <th>Atacado</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {variantes.map((v) => {
                const saldo = saldos[v.id] ?? 0;
                const emin = Number(v.emin ?? 0);
                const custo = Number(v.custo ?? 0);
                const varejo = v.mkv ? markupToPrice(custo, v.mkv) : 0;
                const atacado = v.pfa ? v.pfa : v.mka ? markupToPrice(custo, v.mka) : 0;
                return (
                  <tr key={v.id}>
                    <td className="table-cell-strong">{v.nome}</td>
                    <td className="table-cell-muted">{v.sku || '—'}</td>
                    <td>
                      {fmtQ(saldo)} {v.un}
                    </td>
                    <td>{varejo > 0 ? fmtCurrency(varejo) : '—'}</td>
                    <td>{atacado > 0 ? fmtCurrency(atacado) : '—'}</td>
                    <td>
                      <StatusBadge tone={stockTone(saldo, emin)}>
                        {stockLabel(saldo, emin)}
                      </StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rf-ui-charts-grid">
        <ChartCard title="Estoque por variante">
          <SystemBarChart
            data={estoqueData}
            xKey="nome"
            series={[{ key: 'saldo', label: 'Saldo', color: 'var(--color-accent)' }]}
            height={180}
            ariaLabel="Saldo em estoque por variante"
            emptyTitle="Sem saldo registrado."
          />
        </ChartCard>

        <ChartCard
          title="Qtde vendida por variante"
          description={loadingVendas ? 'Atualizando...' : undefined}
          action={periodSelector}
        >
          <SystemBarChart
            data={vendasData}
            xKey="nome"
            series={[{ key: 'qty', label: 'Qtde', color: 'var(--color-success)' }]}
            height={180}
            ariaLabel="Quantidade vendida por variante"
            emptyTitle="Sem vendas no período."
            emptyDescription="Requer migração pedido_itens (sql/18)."
          />
        </ChartCard>

        <ChartCard title="Receita por variante" action={periodSelector}>
          <SystemBarChart
            data={vendasData}
            xKey="nome"
            series={[{ key: 'receita', label: 'Receita', color: 'var(--color-primary)' }]}
            height={180}
            valueFormatter={(v) => fmtCurrency(Number(v ?? 0))}
            ariaLabel="Receita por variante"
            emptyTitle="Sem receita no período."
          />
        </ChartCard>
      </div>
    </div>
  );
}
