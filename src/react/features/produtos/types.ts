import type { Produto } from '../../../types/domain';

export type ProdutoFiltro = {
  q: string;
  cat: string;
};

export type ProdutoSaldo = {
  saldo: number;
  cm: number;
  ult?: string | null;
};

export type ProdutoFormValues = {
  id: string | null;
  produto_pai_id: string | null;
  nome: string;
  sku: string;
  un: string;
  cat: string;
  custo: string;
  precoVarejo: string;
  markupVarejo: string;
  margemVarejo: string;
  descontoVarejo: string;
  markupAtacado: string;
  margemAtacado: string;
  precoFixoAtacado: string;
  descontoAtacado: string;
  qtmin: string;
  emin: string;
  esal: string;
  ecm: string;
  is_sample?: boolean;
  genero?: 'masculino' | 'feminino' | null;
  tamanho?: string | null;
  foto_url?: string | null;
};

export type ProdutoWriteInput = Omit<Produto, 'id'> & { id?: string };

export const FILTRO_VAZIO: ProdutoFiltro = { q: '', cat: '' };

export const FORM_VAZIO: ProdutoFormValues = {
  id: null,
  produto_pai_id: null,
  nome: '',
  sku: '',
  un: 'un',
  cat: '',
  custo: '',
  precoVarejo: '',
  markupVarejo: '',
  margemVarejo: '',
  descontoVarejo: '',
  markupAtacado: '',
  margemAtacado: '',
  precoFixoAtacado: '',
  descontoAtacado: '',
  qtmin: '',
  emin: '',
  esal: '',
  ecm: '',
  is_sample: false,
  genero: null,
  tamanho: null,
  foto_url: null
};
