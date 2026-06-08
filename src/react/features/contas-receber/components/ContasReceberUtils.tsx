import type { ContaReceber, ContaReceberBaixa } from '../../../../types/domain';
import { StatusBadge } from '../../../shared/ui';
import { getStatusEfetivo, getStatusLabel } from '../hooks/useContasReceberMutations';

export function hoje(): string {
  return new Date().toISOString().split('T')[0];
}

export function fmt(value: number | string | undefined | null): string {
  const n = Number(value ?? 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDateTimeLabel(iso: string | null | undefined): string {
  if (!iso) return '-';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return String(iso).slice(0, 16).replace('T', ' ');
  return parsed.toLocaleString('pt-BR');
}

export function toDateTimeLocalValue(date: Date = new Date()): string {
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocalValue(value: string): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function getStatusTone(cr: ContaReceber): 'success' | 'warning' | 'neutral' {
  const label = getStatusLabel(cr);
  if (label === 'Recebido') return 'success';
  if (label === 'Parcial') return 'warning';
  return 'neutral';
}

export function FinanceStatusBadge({ cr }: { cr: ContaReceber }) {
  return <StatusBadge tone={getStatusTone(cr)}>{getStatusLabel(cr)}</StatusBadge>;
}

export function getBaixasConta(allBaixas: ContaReceberBaixa[], contaId: string): ContaReceberBaixa[] {
  return allBaixas
    .filter((b) => b.conta_receber_id === contaId)
    .sort((a, b) => String(b.recebido_em || '').localeCompare(String(a.recebido_em || '')));
}

export function filterContas(
  contas: ContaReceber[],
  statusEfetivo: 'pendente_ok' | 'vencido' | 'recebido',
  searchQuery: string
) {
  const q = searchQuery.toLowerCase();
  return [...contas]
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .filter(
      (c) =>
        // Contas canceladas nunca aparecem nas abas normais
        getStatusEfetivo(c) !== 'cancelado' &&
        getStatusEfetivo(c) === statusEfetivo &&
        (!q ||
          c.cliente.toLowerCase().includes(q) ||
          String(c.pedido_num ?? '').includes(q) ||
          getStatusLabel(c).toLowerCase().includes(q))
    );
}
