import type { Fornecedor, CotacaoLog } from '../../../types/domain';

export type { Fornecedor, CotacaoLog };

export type CotacaoPrecoRow = {
  filial_id: string;
  produto_id: string;
  fornecedor_id: string;
  preco: number;
};

export type CotacaoConfig = {
  filial_id: string;
  locked: boolean;
  logs: CotacaoLog[];
};

// prices[prodId][fornId] = price
export type PrecosMap = Record<string, Record<string, number>>;

export type CotacaoSheet = {
  name: string;
  rows: Array<Array<string | number | null | undefined>>;
};

export type CotacaoMapaDraft = {
  sheet: number;
  nomeCol: number;
  precoCol: number;
  catCol: number;
  tabelaCol: number;
  descontoCol: number;
  startLine: number;
  mes: string;
};

export type ImportMapContext = {
  forn: Fornecedor;
  filename: string;
  sheets: CotacaoSheet[];
  savedLayout?: Record<string, unknown> | null;
};

export type ImportResumo = {
  novos: number;
  atualizados: number;
  ignorados: number;
  falhas: number;
  ignoradosExemplos: Array<{ linha: string | number; nome: string; motivo: string }>;
};

export type CotacaoView = 'importar' | 'fornecedores' | 'cotacao';

export type CotacaoStatus = 'idle' | 'loading' | 'ready' | 'error';
