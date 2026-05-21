import type { MovimentoEstoque, Produto } from '../../../../types/domain';
import type {
  EstoqueHistoryRow,
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

function fmtCurrency(value: number): string {
  return Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

function fmtQuantity(value: number): string {
  return Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function fmtDate(value?: string): string {
  if (!value) return '—';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function normalizeHistoryType(value: string): EstoqueHistoryRow['tipo'] {
  if (value === 'entrada' || value === 'saida' || value === 'ajuste' || value === 'transf') {
    return value;
  }
  return 'ajuste';
}

export function calculateEstoqueSaldos(
  produtos: Produto[],
  movimentacoes: MovimentoEstoque[]
): Record<string, SaldoInfo> {
  const map: Record<string, SaldoInfo> = {};

  produtos.forEach((produto) => {
    map[produto.id] = {
      saldo: 0, // Inicia do zero para poder calcular o Custo Médio corretamente repassando o histórico
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
      const hist = saldos[produto.id] || {
        saldo: 0,
        cm: toNumber(produto.ecm) || toNumber(produto.custo)
      };
      
      const saldoReal = toNumber(produto.esal);
      const minimo = toNumber(produto.emin);
      
      return {
        id: produto.id,
        nome: produto.nome,
        sku: produto.sku || '',
        unidade: produto.unidade || produto.un || '',
        saldo: saldoReal, // Usa o saldo real da tabela produtos como fonte da verdade
        custoMedio: hist.cm,
        valorEstoque: saldoReal * hist.cm,
        minimo,
        status: getSaldoStatus(saldoReal, minimo),
        categoria: produto.cat || produto.categoria || 'Sem categoria'
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function buildEstoqueMetrics(
  rows: EstoquePositionRow[],
  movimentacoes: MovimentoEstoque[]
): EstoqueMetrics {
  const valorEmEstoque = rows.reduce((total, row) => total + row.valorEstoque, 0);

  // Calcula Custo das Mercadorias Vendidas (Saídas)
  let custoSaidas = 0;
  movimentacoes.forEach(mov => {
    if (mov.tipo === 'saida') {
      const qty = toNumber(mov.qty);
      const row = rows.find(r => r.id === (mov.prodId || mov.prod_id));
      const custo = row ? row.custoMedio : 0;
      custoSaidas += (qty * custo);
    }
  });

  // Giro = COGS / Average Inventory (using current inventory as proxy for now)
  const giroMedio = valorEmEstoque > 0 ? (custoSaidas / valorEmEstoque) : 0;

  return {
    produtos: rows.length,
    valorEmEstoque,
    valorEmEstoqueTendency: 'neutral', // placeholder for now
    emAlerta: rows.filter((row) => row.status === 'baixo').length,
    zerados: rows.filter((row) => row.status === 'zerado').length,
    giroMedio,
    giroMedioTendency: 'up' // placeholder for now
  };
}

export function buildEstoqueHistoryRows(
  produtos: Produto[],
  movimentacoes: MovimentoEstoque[]
): EstoqueHistoryRow[] {
  const produtosById = new Map(produtos.map((produto) => [produto.id, produto]));

  return [...movimentacoes]
    .sort((a, b) => toNumber(b.ts) - toNumber(a.ts))
    .map((movimento) => {
      const produtoId = movimento.prodId || movimento.prod_id;
      const produto = produtoId ? produtosById.get(produtoId) : null;
      const quantidade =
        movimento.tipo === 'ajuste'
          ? toNumber(movimento.saldo_real ?? movimento.saldoReal)
          : toNumber(movimento.qty);

      return {
        id: String(movimento.id),
        produto: produto?.nome || 'Produto removido',
        data: fmtDate(movimento.data),
        tipo: normalizeHistoryType(String(movimento.tipo || '')),
        quantidadeLabel:
          movimento.tipo === 'ajuste'
            ? `Saldo real: ${fmtQuantity(quantidade)}`
            : fmtQuantity(quantidade),
        custoLabel:
          movimento.tipo === 'entrada' && toNumber(movimento.custo) > 0
            ? fmtCurrency(toNumber(movimento.custo))
            : '—',
        observacao: String(movimento.obs || '').trim()
      };
    });
}

export function filterEstoquePositionRows(
  rows: EstoquePositionRow[],
  query: string,
  statusFilter: EstoqueStatusFilter,
  categoriaFilter?: string
): EstoquePositionRow[] {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedCategoria = categoriaFilter?.trim().toLowerCase();

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

    const matchesCategoria = !normalizedCategoria || (row.categoria || '').toLowerCase() === normalizedCategoria;

    return matchesQuery && matchesStatus && matchesCategoria;
  });
}

export function filterEstoqueHistoryRows(
  rows: EstoqueHistoryRow[],
  query: string,
  tipoHistorico: EstoqueHistoryRow['tipo'] | ''
): EstoqueHistoryRow[] {
  const normalizedQuery = query.trim().toLowerCase();

  return rows.filter((row) => {
    const matchesQuery =
      !normalizedQuery ||
      row.produto.toLowerCase().includes(normalizedQuery) ||
      row.observacao.toLowerCase().includes(normalizedQuery) ||
      row.data.toLowerCase().includes(normalizedQuery);

    const matchesTipo = !tipoHistorico || row.tipo === tipoHistorico;

    return matchesQuery && matchesTipo;
  });
}
