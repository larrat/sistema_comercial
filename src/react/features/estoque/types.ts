import type { MovimentoEstoque, Produto } from '../../../../types/domain';

export type EstoqueView = 'posicao' | 'historico';

export type EstoqueStatusFilter = '' | 'ok' | 'baixo' | 'zerado';

export type EstoqueMovementType = '' | 'entrada' | 'saida' | 'ajuste' | 'transf';
export type EstoqueMovementMode = Exclude<EstoqueMovementType, '' | 'transf'>;

export type EstoquePositionRow = {
  id: string;
  nome: string;
  sku?: string;
  unidade?: string;
  saldo: number;
  custoMedio: number;
  valorEstoque: number;
  minimo: number;
  status: EstoqueStatusFilter;
};

export type EstoqueHistoryRow = {
  id: string;
  produto: string;
  data: string;
  tipo: Exclude<EstoqueMovementType, ''>;
  quantidadeLabel: string;
  custoLabel: string;
  observacao: string;
};

export type EstoqueMetrics = {
  produtos: number;
  valorEmEstoque: number;
  emAlerta: number;
  zerados: number;
};

export type EstoquePositionSnapshot = {
  produtos: Produto[];
  movimentacoes: MovimentoEstoque[];
};

export type EstoqueMovementDraft = {
  produtoId: string;
  tipo: EstoqueMovementMode;
  data: string;
  quantidade: string;
  custo: string;
  observacao: string;
  saldoReal: string;
};
