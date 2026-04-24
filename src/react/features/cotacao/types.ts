import type {
  CotacaoConfig as DomainCotacaoConfig,
  CotacaoLayout as DomainCotacaoLayout,
  CotacaoLog as DomainCotacaoLog,
  CotacaoSheet as DomainCotacaoSheet,
  Fornecedor as DomainFornecedor,
  Produto
} from '../../../types/domain';

export type CotacaoTabId = 'cotacao' | 'fornecedores' | 'importar';

export const COTACAO_TABS: ReadonlyArray<CotacaoTabId> = [
  'cotacao',
  'fornecedores',
  'importar'
];

export const DEFAULT_COTACAO_TAB: CotacaoTabId = 'cotacao';

export function isCotacaoTabId(value: string | null | undefined): value is CotacaoTabId {
  return !!value && COTACAO_TABS.includes(value as CotacaoTabId);
}

export type Fornecedor = DomainFornecedor;
export type CotacaoLog = DomainCotacaoLog;
export type CotacaoConfig = DomainCotacaoConfig;
export type CotacaoSheet = DomainCotacaoSheet;
export type CotacaoLayout = DomainCotacaoLayout;

export type PrecosMap = Record<string, Record<string, number>>;

export type CotacaoMetrics = {
  produtos: number;
  fornecedores: number;
  preenchimento: number;
  melhorFornecedor: string | null;
};

export type CotacaoFornecedorRow = {
  id: string;
  nome: string;
  contato?: string;
  prazo?: string;
  produtosCotados: number;
  totalCotado: number;
};

export type CotacaoTabelaRow = {
  id: string;
  produto: string;
  unidade: string;
  melhorPreco: number | null;
  piorPreco: number | null;
  melhorFornecedor: string | null;
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

export type CotacaoHeaderOption = {
  label: string;
  idx: number;
};

export type ImportResumo = {
  status?: 'success' | 'partial' | 'failed';
  novos: number;
  atualizados: number;
  ignorados: number;
  falhas: number;
  itensProblematicos?: Array<{
    etapa: 'produtos' | 'cotacao_atual' | 'historico' | 'layout' | 'log';
    nome: string;
    motivo: string;
  }>;
  etapas?: Array<{
    id: 'produtos' | 'cotacao_atual' | 'historico' | 'layout' | 'log';
    label: string;
    status: 'success' | 'partial' | 'failed';
    processados: number;
    sucesso: number;
    falhas: number;
  }>;
  ignoradosExemplos: Array<{
    linha: number | string;
    nome: string;
    motivo: string;
  }>;
};

export type ImportMatchStatus = 'matched' | 'ambiguous' | 'unmatched';

export type ImportMatchReviewRow = {
  nomeOriginal: string;
  status: ImportMatchStatus;
  produtoId?: string;
  produtoNome?: string;
  candidatos?: string[];
};

export type ImportMatchReview = {
  total: number;
  matched: number;
  ambiguous: number;
  unmatched: number;
  blocking: number;
  rows: ImportMatchReviewRow[];
};

export type CotacaoImportContext = {
  forn: Fornecedor;
  filename: string;
  sheets: CotacaoSheet[];
  savedLayout?: Record<string, unknown> | null;
};

export type CotacaoApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
};

export type CotacaoPrecoRecord = {
  filial_id: string;
  produto_id: string;
  fornecedor_id: string;
  preco: number;
  preco_tabela?: number | null;
  perc_desconto?: number | null;
  mes_ref?: string | null;
  arquivo_origem?: string | null;
};

export type CotacaoHistoricoRecord = {
  filial_id: string;
  produto_id: string;
  fornecedor_id: string;
  mes_ref: string;
  preco?: number;
  tabela?: number | null;
  desconto?: number | null;
  preco_liquido?: number | null;
  descricao_importada?: string | null;
  categoria_importada?: string | null;
  arquivo_origem?: string | null;
  linha_origem?: number | null;
};

export type CotacaoInitialData = {
  produtos: Produto[];
  fornecedores: Fornecedor[];
  precos: PrecosMap;
  config: CotacaoConfig;
  metrics: CotacaoMetrics;
  fornecedoresRows: CotacaoFornecedorRow[];
  tabela: CotacaoTabelaRow[];
};
