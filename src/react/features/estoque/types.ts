import type { MovimentoEstoque, Produto } from '../../../types/domain';

export type EstoqueView = 'posicao' | 'historico' | 'cobertura' | 'sem_movimento';

export type EstoquePeriodoFilter = 'semana' | 'mes' | 'ano' | 'tudo';

export type EstoqueStatusFilter = '' | 'ok' | 'baixo' | 'zerado';
export type EstoqueCategoriaFilter = string;

export type EstoqueMovementType = '' | 'entrada' | 'saida' | 'ajuste' | 'transf';
export type EstoqueMovementMode = Exclude<EstoqueMovementType, ''>;

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
  categoria?: string;
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

export type Tendency = 'up' | 'down' | 'neutral' | null;

export type EstoqueMetrics = {
  produtos: number;
  valorEmEstoque: number;
  valorEmEstoqueTendency: Tendency;
  emAlerta: number;
  zerados: number;
  giroMedio: number;
  giroMedioTendency: Tendency;
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
  destinoFilialId: string;
};
