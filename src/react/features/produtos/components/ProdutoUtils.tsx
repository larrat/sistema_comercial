import React from 'react';
import type { Produto } from '../../../../types/domain';
import type { ProdutoSaldo } from '../types';
import { markupToPrice, priceToMargin } from '../hooks/useProdutoCalculations';

export type KpiCard = {
  label: string;
  value: string;
  subtitle: string;
  tone?: 'positive' | 'negative' | 'neutral';
};

export function toNumber(value?: number | null): number {
  return Number(value || 0);
}

export function formatCurrency(value: number): string {
  return Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

export function formatQuantity(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(3);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getStockStatus(produto: Produto, saldo: ProdutoSaldo): { label: string; tone: string } {
  const minimo = toNumber(produto.emin);
  if (saldo.saldo <= 0) return { label: 'Zerado', tone: 'danger' };
  if (minimo > 0 && saldo.saldo < minimo) return { label: 'Baixo', tone: 'warning' };
  return { label: 'OK', tone: 'success' };
}

export function getPrecos(produto: Produto) {
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

export function buildKpis(produto: Produto, saldo: ProdutoSaldo): KpiCard[] {
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
      label: 'Venda Varejo',
      value: varejo > 0 ? formatCurrency(varejo) : '—',
      subtitle: varejo > 0 ? `Margem ${formatPercent(margemVarejo)}` : 'Não definido',
      tone: varejo > 0 ? 'positive' : 'neutral'
    },
    {
      label: 'Venda Atacado',
      value: atacado > 0 ? formatCurrency(atacado) : '—',
      subtitle: atacado > 0 ? 'Tabela atacado' : 'Não definido',
      tone: atacado > 0 ? 'positive' : 'neutral'
    },
    {
      label: 'Estoque',
      value: `${formatQuantity(saldo.saldo)} ${produto.un || 'un'}`,
      subtitle: getStockStatus(produto, saldo).label,
      tone: saldoTone
    }
  ];
}

export function ProdutoInfoTable({ rows }: { rows: Array<{ label: React.ReactNode; value: React.ReactNode }> }) {
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row, idx) => (
        <div key={idx} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
          <span className="text-sm font-medium text-slate-400">{row.label}</span>
          <div className="text-[13px] font-bold text-white">{row.value || '—'}</div>
        </div>
      ))}
    </div>
  );
}
