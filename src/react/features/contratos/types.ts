export type Servico = {
  id: string;
  filial_id: string;
  nome: string;
  custo_padrao: number;
  preco_venda: number;
  categoria?: string;
  ativo: boolean;
  criado_em: string;
};

export type ContratoStatus = 'ativo' | 'concluido' | 'cancelado' | 'suspenso';

export type Contrato = {
  id: string;
  filial_id: string;
  cliente_id: string;
  oportunidade_id?: string;
  titulo: string;
  data_inicio?: string;
  previsao_fim?: string;
  valor_total: number;
  status: ContratoStatus;
  observacoes?: string;
  criado_por?: string;
  atualizado_por?: string;
  criado_em: string;
  atualizado_em: string;
  
  // Joins
  cliente?: {
    nome: string;
    doc?: string;
  };
};

export type OsStatus = 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';

export type OrdemServico = {
  id: string;
  filial_id: string;
  contrato_id: string;
  titulo: string;
  descricao?: string;
  status: OsStatus;
  data_agendada?: string;
  data_conclusao?: string;
  responsavel_id?: string;
  criado_por?: string;
  criado_em: string;
  atualizado_em: string;
};

export type ContratoDraft = Pick<Contrato, 'cliente_id' | 'oportunidade_id' | 'titulo' | 'valor_total' | 'data_inicio' | 'previsao_fim'>;
export type OrdemServicoDraft = Pick<OrdemServico, 'contrato_id' | 'titulo' | 'descricao' | 'data_agendada' | 'responsavel_id'>;
