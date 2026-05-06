import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Produto } from '../../../../types/domain';
import { emitLegacyEvent } from '../../../app/legacy/events';
import { EmptyState, ErrorState, FormError, LoadingState } from '../../../shared/ui';
import { markupToPrice, priceToMargin } from '../hooks/useProdutoCalculations';
import { useProdutoMutations } from '../hooks/useProdutoMutations';
import type { ProdutoFormValues, ProdutoSaldo } from '../types';
import { ProdutoForm } from './ProdutoForm';
import { ProdutoVariantesTab } from './ProdutoVariantesTab';

type ProdutoProfileTab = 'resumo' | 'precificacao' | 'estoque' | 'cadastro' | 'variantes';

type Props = {
  produto: Produto;
  pais: Produto[];
  saldo?: ProdutoSaldo;
  loadingProduto?: boolean;
  error?: string | null;
  onProdutoSaved?: (produto: Produto) => void;
  onReload?: () => void;
};

type KpiCard = {
  label: string;
  value: string;
  subtitle: string;
  tone?: 'positive' | 'negative' | 'neutral';
};

const BASE_TABS: Array<{ id: ProdutoProfileTab; label: string }> = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'precificacao', label: 'Precificação' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'cadastro', label: 'Cadastro' }
];

const ALL_TAB_IDS: ProdutoProfileTab[] = ['resumo', 'precificacao', 'estoque', 'cadastro', 'variantes'];

function normalizeTab(value: string | null): ProdutoProfileTab {
  return ALL_TAB_IDS.includes(value as ProdutoProfileTab) ? (value as ProdutoProfileTab) : 'resumo';
}

function toNumber(value?: number | null): number {
  return Number(value || 0);
}

function formatCurrency(value: number): string {
  return Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

function formatQuantity(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(3);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getInitials(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function getStockStatus(produto: Produto, saldo: ProdutoSaldo): { label: string; tone: string } {
  const minimo = toNumber(produto.emin);
  if (saldo.saldo <= 0) return { label: 'Zerado', tone: 'danger' };
  if (minimo > 0 && saldo.saldo < minimo) return { label: 'Baixo', tone: 'warning' };
  return { label: 'OK', tone: 'success' };
}

function getPrecos(produto: Produto) {
  const custo = toNumber(produto.custo);
  const mkv = toNumber(produto.mkv);
  const mka = toNumber(produto.mka);
  const pfa = toNumber(produto.pfa);
  const varejo = mkv > 0 ? markupToPrice(custo, mkv) : toNumber(produto.pvv);
  const atacado = pfa > 0 ? pfa : mka > 0 ? markupToPrice(custo, mka) : 0;
  const margemVarejo = varejo > 0 ? priceToMargin(custo, varejo) : 0;
  const margemAtacado = atacado > 0 ? priceToMargin(custo, atacado) : 0;
  return { custo, varejo, atacado, margemVarejo, margemAtacado };
}

function buildKpis(produto: Produto, saldo: ProdutoSaldo): KpiCard[] {
  const { custo, varejo, atacado, margemVarejo } = getPrecos(produto);
  const minimo = toNumber(produto.emin);
  const saldoTone =
    saldo.saldo <= 0 ? 'negative' : minimo > 0 && saldo.saldo < minimo ? 'negative' : 'positive';

  return [
    {
      label: 'Custo',
      value: formatCurrency(custo),
      subtitle: 'Base de cálculo'
    },
    {
      label: 'Varejo',
      value: varejo > 0 ? formatCurrency(varejo) : 'Sem preço',
      subtitle: margemVarejo > 0 ? `${formatPercent(margemVarejo)} margem` : 'Sem regra',
      tone: margemVarejo > 0 ? 'positive' : 'neutral'
    },
    {
      label: 'Atacado',
      value: atacado > 0 ? formatCurrency(atacado) : 'Sem preço',
      subtitle: atacado > 0 ? 'Preço em volume' : 'Sem regra'
    },
    {
      label: 'Saldo',
      value: `${formatQuantity(saldo.saldo)} ${produto.un || 'un'}`,
      subtitle:
        minimo > 0 ? `Mínimo ${formatQuantity(minimo)} ${produto.un || 'un'}` : 'Sem mínimo',
      tone: saldoTone
    }
  ];
}

function ProdutoInfoTable({
  rows
}: {
  rows: Array<{ label: string; value: string | null | undefined }>;
}) {
  return (
    <div className="rf-cliente-profile__info-table">
      {rows.map((row) => (
        <div key={row.label} className="rf-cliente-profile__info-row">
          <span className="rf-cliente-profile__info-label">{row.label}</span>
          <span
            className={
              row.value
                ? 'rf-cliente-profile__info-value'
                : 'rf-cliente-profile__info-value is-muted'
            }
          >
            {row.value || 'Não informado'}
          </span>
        </div>
      ))}
    </div>
  );
}

function formValuesToProduto(
  values: ProdutoFormValues,
  filialId: string | null | undefined,
  existing: Produto
): Produto {
  const custo = parseFloat(values.custo) || 0;
  const precoVarejo = parseFloat(values.precoVarejo) || 0;
  const mkv =
    precoVarejo > 0 && custo > 0
      ? (precoVarejo / custo - 1) * 100
      : parseFloat(values.markupVarejo) || 0;

  return {
    ...existing,
    id: values.id ?? existing.id,
    filial_id: filialId ?? existing.filial_id,
    produto_pai_id: values.produto_pai_id ?? null,
    nome: values.nome.trim(),
    sku: values.sku.trim() || undefined,
    un: values.un || 'un',
    cat: values.cat.trim() || undefined,
    custo,
    mkv,
    mka: parseFloat(values.markupAtacado) || 0,
    pfa: parseFloat(values.precoFixoAtacado) || 0,
    dv: parseFloat(values.descontoVarejo) || 0,
    da: parseFloat(values.descontoAtacado) || 0,
    qtmin: parseFloat(values.qtmin) || 0,
    emin: parseFloat(values.emin) || 0,
    esal: parseFloat(values.esal) || 0,
    ecm: parseFloat(values.ecm) || custo,
    hist_cot: existing.hist_cot ?? []
  };
}

export function ProdutoProfilePage({
  produto,
  pais,
  saldo = { saldo: 0, cm: 0 },
  loadingProduto = false,
  error,
  onProdutoSaved,
  onReload
}: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingCadastro, setEditingCadastro] = useState(searchParams.get('edit') === '1');
  const { submitProduto, saving, error: mutationError } = useProdutoMutations();

  const activeTab = normalizeTab(searchParams.get('tab'));
  const isPai = !produto.produto_pai_id;
  const profileTabs = isPai
    ? [...BASE_TABS, { id: 'variantes' as const, label: 'Variantes' }]
    : BASE_TABS;
  const stockStatus = getStockStatus(produto, saldo);
  const precos = useMemo(() => getPrecos(produto), [produto]);
  const kpis = useMemo(() => buildKpis(produto, saldo), [produto, saldo]);
  const sortedHist = useMemo(
    () =>
      [...(produto.hist_cot ?? [])].sort((a, b) =>
        String(b.mes ?? '').localeCompare(String(a.mes ?? ''))
      ),
    [produto.hist_cot]
  );

  useEffect(() => {
    setEditingCadastro(searchParams.get('edit') === '1');
  }, [produto.id, searchParams]);

  function setTab(tab: ProdutoProfileTab) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (tab === 'resumo') next.delete('tab');
      else next.set('tab', tab);
      next.delete('edit');
      return next;
    });
    setEditingCadastro(false);
  }

  function startEdit() {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tab', 'cadastro');
      next.set('edit', '1');
      return next;
    });
    setEditingCadastro(true);
  }

  async function handleSalvar(values: ProdutoFormValues) {
    const saved = await submitProduto(formValuesToProduto(values, produto.filial_id, produto));
    setEditingCadastro(false);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tab', 'cadastro');
      next.delete('edit');
      return next;
    });
    onProdutoSaved?.(saved);
    onReload?.();
  }

  if (loadingProduto) {
    return (
      <main className="rf-content rf-ui-stack rf-cliente-profile rf-produto-profile">
        <LoadingState
          title="Carregando produto..."
          description="Estamos reunindo cadastro, preço e estoque para abrir a visão completa."
        />
      </main>
    );
  }

  return (
    <main
      className="rf-content rf-ui-stack rf-cliente-profile rf-produto-profile"
      data-testid="produto-profile-page"
    >
      <div className="rf-cliente-profile__breadcrumb">
        <button
          className="rf-cliente-profile__back"
          type="button"
          onClick={() => navigate('/app/produtos')}
        >
          Voltar
        </button>
        <span>Produtos / {produto.nome}</span>
      </div>

      {error ? <ErrorState title={error} compact onRetry={onReload} /> : null}

      <section className="rf-cliente-profile__hero">
        <div className="rf-cliente-profile__hero-main">
          <div className="rf-cliente-profile__avatar">{getInitials(produto.nome)}</div>
          <div className="rf-cliente-profile__hero-copy">
            <div className="rf-cliente-profile__title-row">
              <h1>{produto.nome}</h1>
              <span className={`rf-cliente-profile__pill is-${stockStatus.tone}`}>
                {stockStatus.label}
              </span>
              {produto.produto_pai_id ? (
                <span className="rf-cliente-profile__pill is-info">Variante</span>
              ) : null}
            </div>
            <p className="rf-cliente-profile__meta-line">
              {produto.sku || 'Sem SKU'} · {produto.cat || 'Sem categoria'} · Unidade{' '}
              {produto.un || 'un'}
            </p>
          </div>
        </div>

        <div className="rf-cliente-profile__hero-actions">
          <button
            className="btn btn-sm"
            type="button"
            onClick={() => emitLegacyEvent('sc:abrir-mov-produto', { id: produto.id })}
          >
            Movimentar estoque
          </button>
          <button className="btn btn-p btn-sm" type="button" onClick={startEdit}>
            Editar cadastro
          </button>
        </div>
      </section>

      <section className="rf-cliente-profile__kpis">
        {kpis.map((card) => (
          <article key={card.label} className="rf-cliente-profile__kpi-card">
            <div className="rf-cliente-profile__kpi-label">{card.label}</div>
            <div className="rf-cliente-profile__kpi-value">{card.value}</div>
            <div
              className={`rf-cliente-profile__kpi-subtitle${card.tone ? ` is-${card.tone}` : ''}`}
            >
              {card.subtitle}
            </div>
          </article>
        ))}
      </section>

      <div className="rf-cliente-profile__tabs">
        {profileTabs.map((tab) => (
          <button
            key={tab.id}
            className={`rf-cliente-profile__tab${activeTab === tab.id ? ' is-active' : ''}`}
            type="button"
            onClick={() => setTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'resumo' ? (
        <section className="rf-cliente-profile__summary-grid">
          <div className="rf-cliente-profile__summary-main">
            <section className="rf-cliente-profile__card">
              <div className="rf-cliente-profile__card-head">
                <div>
                  <h3 className="rf-cliente-profile__card-title">Resumo comercial</h3>
                  <p className="rf-cliente-profile__card-subtitle">
                    Preço, margem e condição básica do produto.
                  </p>
                </div>
              </div>
              <ProdutoInfoTable
                rows={[
                  { label: 'Custo', value: formatCurrency(precos.custo) },
                  {
                    label: 'Varejo',
                    value: precos.varejo > 0 ? formatCurrency(precos.varejo) : null
                  },
                  {
                    label: 'Margem varejo',
                    value: precos.margemVarejo > 0 ? formatPercent(precos.margemVarejo) : null
                  },
                  {
                    label: 'Atacado',
                    value: precos.atacado > 0 ? formatCurrency(precos.atacado) : null
                  },
                  {
                    label: 'Qtde mínima',
                    value:
                      toNumber(produto.qtmin) > 0
                        ? `${formatQuantity(toNumber(produto.qtmin))} ${produto.un}`
                        : null
                  }
                ]}
              />
            </section>

            <section className="rf-cliente-profile__card">
              <div className="rf-cliente-profile__card-head">
                <div>
                  <h3 className="rf-cliente-profile__card-title">Estoque</h3>
                  <p className="rf-cliente-profile__card-subtitle">
                    Saldo e referência de reposição.
                  </p>
                </div>
              </div>
              <ProdutoInfoTable
                rows={[
                  {
                    label: 'Saldo atual',
                    value: `${formatQuantity(saldo.saldo)} ${produto.un || 'un'}`
                  },
                  {
                    label: 'Mínimo',
                    value:
                      toNumber(produto.emin) > 0
                        ? `${formatQuantity(toNumber(produto.emin))} ${produto.un}`
                        : null
                  },
                  {
                    label: 'Alerta',
                    value:
                      toNumber(produto.esal) > 0
                        ? `${formatQuantity(toNumber(produto.esal))} ${produto.un}`
                        : null
                  },
                  {
                    label: 'Custo médio',
                    value: formatCurrency(saldo.cm || toNumber(produto.ecm) || precos.custo)
                  }
                ]}
              />
            </section>
          </div>

          <aside className="rf-cliente-profile__summary-side">
            <section className="rf-cliente-profile__card">
              <div className="rf-cliente-profile__card-head">
                <h3 className="rf-cliente-profile__card-title">Cadastro</h3>
              </div>
              <ProdutoInfoTable
                rows={[
                  { label: 'SKU', value: produto.sku },
                  { label: 'Categoria', value: produto.cat },
                  { label: 'Unidade', value: produto.un },
                  { label: 'Código barras', value: produto.codigo_barras },
                  { label: 'Fornecedor', value: produto.codigo_fornecedor }
                ]}
              />
            </section>

            <section className="rf-cliente-profile__card">
              <div className="rf-cliente-profile__card-head">
                <h3 className="rf-cliente-profile__card-title">Histórico de custo</h3>
              </div>
              {sortedHist.length ? (
                <div className="rf-cliente-profile__table-wrap">
                  <table className="rf-cliente-profile__table">
                    <thead>
                      <tr>
                        <th>Mês</th>
                        <th>Fornecedor</th>
                        <th>Preço</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedHist.slice(0, 5).map((item, index) => (
                        <tr key={`${item.mes}-${index}`}>
                          <td>
                            {String(item.mes ?? '')
                              .split('-')
                              .reverse()
                              .join('/')}
                          </td>
                          <td>{item.forn || '—'}</td>
                          <td>{formatCurrency(toNumber(item.preco))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="Sem histórico de custo." compact />
              )}
            </section>
          </aside>
        </section>
      ) : null}

      {activeTab === 'precificacao' ? (
        <section className="rf-cliente-profile__tab-panel">
          <section className="rf-cliente-profile__card">
            <div className="rf-cliente-profile__card-head">
              <h3 className="rf-cliente-profile__card-title">Precificação</h3>
            </div>
            <ProdutoInfoTable
              rows={[
                { label: 'Custo', value: formatCurrency(precos.custo) },
                {
                  label: 'Markup varejo',
                  value: toNumber(produto.mkv) > 0 ? formatPercent(toNumber(produto.mkv)) : null
                },
                {
                  label: 'Preço varejo',
                  value: precos.varejo > 0 ? formatCurrency(precos.varejo) : null
                },
                {
                  label: 'Margem varejo',
                  value: precos.margemVarejo > 0 ? formatPercent(precos.margemVarejo) : null
                },
                {
                  label: 'Markup atacado',
                  value: toNumber(produto.mka) > 0 ? formatPercent(toNumber(produto.mka)) : null
                },
                {
                  label: 'Preço atacado',
                  value: precos.atacado > 0 ? formatCurrency(precos.atacado) : null
                },
                { label: 'Desconto varejo', value: formatPercent(toNumber(produto.dv)) },
                { label: 'Desconto atacado', value: formatPercent(toNumber(produto.da)) }
              ]}
            />
          </section>
        </section>
      ) : null}

      {activeTab === 'estoque' ? (
        <section className="rf-cliente-profile__tab-panel">
          <section className="rf-cliente-profile__card">
            <div className="rf-cliente-profile__card-head">
              <h3 className="rf-cliente-profile__card-title">Estoque</h3>
            </div>
            <ProdutoInfoTable
              rows={[
                { label: 'Status', value: stockStatus.label },
                {
                  label: 'Saldo atual',
                  value: `${formatQuantity(saldo.saldo)} ${produto.un || 'un'}`
                },
                {
                  label: 'Estoque mínimo',
                  value:
                    toNumber(produto.emin) > 0
                      ? `${formatQuantity(toNumber(produto.emin))} ${produto.un}`
                      : null
                },
                {
                  label: 'Alerta',
                  value:
                    toNumber(produto.esal) > 0
                      ? `${formatQuantity(toNumber(produto.esal))} ${produto.un}`
                      : null
                },
                {
                  label: 'Custo médio',
                  value: formatCurrency(saldo.cm || toNumber(produto.ecm) || precos.custo)
                }
              ]}
            />
          </section>
        </section>
      ) : null}

      {activeTab === 'cadastro' ? (
        <section className="rf-cliente-profile__tab-panel">
          {editingCadastro ? (
            <section className="rf-cliente-profile__card">
              <ProdutoForm
                produto={produto}
                pais={pais}
                saving={saving}
                error={mutationError}
                onSalvar={(values) => void handleSalvar(values)}
                onCancelar={() => {
                  setEditingCadastro(false);
                  setSearchParams((current) => {
                    const next = new URLSearchParams(current);
                    next.set('tab', 'cadastro');
                    next.delete('edit');
                    return next;
                  });
                }}
              />
            </section>
          ) : (
            <section className="rf-cliente-profile__card">
              <div className="rf-cliente-profile__card-head">
                <div>
                  <h3 className="rf-cliente-profile__card-title">Cadastro</h3>
                  <p className="rf-cliente-profile__card-subtitle">
                    Revise os dados principais do produto.
                  </p>
                </div>
                <button className="btn btn-sm" type="button" onClick={startEdit}>
                  Editar cadastro
                </button>
              </div>
              <ProdutoInfoTable
                rows={[
                  { label: 'Nome', value: produto.nome },
                  { label: 'SKU', value: produto.sku },
                  { label: 'Unidade', value: produto.un },
                  { label: 'Categoria', value: produto.cat },
                  {
                    label: 'Produto pai',
                    value: pais.find((item) => item.id === produto.produto_pai_id)?.nome
                  },
                  { label: 'Descrição', value: produto.descricao_padrao }
                ]}
              />
              <FormError message={mutationError} />
            </section>
          )}
        </section>
      ) : null}

      {activeTab === 'variantes' && isPai ? (
        <section className="rf-cliente-profile__tab-panel">
          <ProdutoVariantesTab produto={produto} />
        </section>
      ) : null}
    </main>
  );
}
