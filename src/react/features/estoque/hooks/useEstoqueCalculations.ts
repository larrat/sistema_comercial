import type { MovimentoEstoque, Produto } from '../../../../types/domain';
import type {
  EstoqueMetrics,
  EstoquePositionRow,
  EstoqueStatusFilter
} from '../types';

type SaldoInfo = {
  saldo: number;
  cm: number;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(value || 0);
}

function getSaldoStatus(saldo: number, minimo: number): EstoqueStatusFilter {
  if (saldo <= 0) return 'zerado';
  if (minimo > 0 && saldo < minimo) return 'baixo';
  return 'ok';
}

export function calculateEstoqueSaldos(
  produtos: Produto[],
  movimentacoes: MovimentoEstoque[]
): Record<string, SaldoInfo> {
  const map: Record<string, SaldoInfo> = {};

  produtos.forEach((produto) => {
    map[produto.id] = {
      saldo: toNumber(produto.esal),
      cm: toNumber(produto.ecm) || toNumber(produto.custo)
    };
  });

  [...movimentacoes]
    .sort((a, b) => toNumber(a.ts) - toNumber(b.ts))
    .forEach((movimento) => {
      const produtoId = movimento.prodId || movimento.prod_id;
      if (!produtoId || !map[produtoId]) return;

      const atual = map[produtoId];

      if (movimento.tipo === 'entrada') {
        const quantidade = toNumber(movimento.qty);
        const custoUnitario = toNumber(movimento.custo) || atual.cm || 0;
        const novoSaldo = atual.saldo + quantidade;
        atual.cm =
          novoSaldo > 0
            ? (atual.saldo * atual.cm + quantidade * custoUnitario) / novoSaldo
            : custoUnitario;
        atual.saldo = novoSaldo;
        return;
      }

      if (movimento.tipo === 'saida' || movimento.tipo === 'transf') {
        atual.saldo -= toNumber(movimento.qty);
        return;
      }

      if (movimento.tipo === 'ajuste') {
        atual.saldo = toNumber(movimento.saldo_real ?? movimento.saldoReal);
      }
    });

  return map;
}

export function buildEstoquePositionRows(
  produtos: Produto[],
  movimentacoes: MovimentoEstoque[]
): EstoquePositionRow[] {
  const saldos = calculateEstoqueSaldos(produtos, movimentacoes);

  return produtos
    .map((produto) => {
      const saldo = saldos[produto.id] || {
        saldo: toNumber(produto.esal),
        cm: toNumber(produto.ecm) || toNumber(produto.custo)
      };
      const minimo = toNumber(produto.emin);
      return {
        id: produto.id,
        nome: produto.nome,
        sku: produto.sku || '',
        unidade: produto.unidade || produto.un || '',
        saldo: saldo.saldo,
        custoMedio: saldo.cm,
        valorEstoque: saldo.saldo * saldo.cm,
        minimo,
        status: getSaldoStatus(saldo.saldo, minimo)
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function buildEstoqueMetrics(rows: EstoquePositionRow[]): EstoqueMetrics {
  return {
    produtos: rows.length,
    valorEmEstoque: rows.reduce((total, row) => total + row.valorEstoque, 0),
    emAlerta: rows.filter((row) => row.status === 'baixo').length,
    zerados: rows.filter((row) => row.status === 'zerado').length
  };
}

export function filterEstoquePositionRows(
  rows: EstoquePositionRow[],
  query: string,
  statusFilter: EstoqueStatusFilter
): EstoquePositionRow[] {
  const normalizedQuery = query.trim().toLowerCase();

  return rows.filter((row) => {
    const matchesQuery =
      !normalizedQuery ||
      row.nome.toLowerCase().includes(normalizedQuery) ||
      (row.sku || '').toLowerCase().includes(normalizedQuery);

    let matchesStatus = true;
    if (statusFilter === 'ok') {
      matchesStatus = row.saldo >= row.minimo && row.saldo > 0;
    } else if (statusFilter === 'baixo') {
      matchesStatus = row.minimo > 0 && row.saldo > 0 && row.saldo < row.minimo;
    } else if (statusFilter === 'zerado') {
      matchesStatus = row.saldo <= 0;
    }

    return matchesQuery && matchesStatus;
  });
}
