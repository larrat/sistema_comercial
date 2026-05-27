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
  aditivos?: ContratoAditivo[];
  cronograma?: ContratoCronograma[];
  diarios?: DiarioObra[];
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
  terceirizado_id?: string | null;
  valor_parceiro?: number;
  is_garantia?: boolean;
  criado_por?: string;
  criado_em: string;
  atualizado_em: string;
};

export type ContratoAditivo = {
  id: string;
  filial_id: string;
  contrato_id: string;
  titulo: string;
  valor: number;
  criado_por?: string;
  criado_em: string;
};

export type ContratoCronograma = {
  id: string;
  filial_id: string;
  contrato_id: string;
  titulo: string;
  data_inicio?: string;
  data_fim?: string;
  percentual_conclusao: number;
  precedente_id?: string | null;
  valor_faturamento: number;
  criado_em: string;
};

export type DiarioObra = {
  id: string;
  filial_id: string;
  contrato_id: string;
  titulo: string;
  relatorio: string;
  fotos?: string[];
  clima?: 'ensolarado' | 'chuvoso' | 'nublado';
  mao_de_obra_qtd?: number;
  criado_por?: string;
  criado_em: string;
};

export type ContratoArquivo = {
  id: string;
  filial_id: string;
  contrato_id: string;
  pedido_compra_id?: string | null;
  nome_arquivo: string;
  url_arquivo: string;
  tipo_documento: 'contrato' | 'nf_fornecedor' | 'garantia' | 'termo_aceite' | 'foto_diario' | 'outro';
  criado_por?: string;
  criado_em: string;
};

export type ContratoDraft = Pick<Contrato, 'cliente_id' | 'oportunidade_id' | 'titulo' | 'valor_total' | 'data_inicio' | 'previsao_fim'>;
export type OrdemServicoDraft = Pick<OrdemServico, 'contrato_id' | 'titulo' | 'descricao' | 'data_agendada' | 'responsavel_id' | 'terceirizado_id' | 'valor_parceiro' | 'is_garantia'>;
export type ContratoAditivoDraft = Pick<ContratoAditivo, 'contrato_id' | 'titulo' | 'valor'>;
export type ContratoCronogramaDraft = Pick<ContratoCronograma, 'contrato_id' | 'titulo' | 'data_inicio' | 'data_fim' | 'percentual_conclusao' | 'precedente_id' | 'valor_faturamento'>;
export type DiarioObraDraft = Pick<DiarioObra, 'contrato_id' | 'titulo' | 'relatorio' | 'fotos' | 'clima' | 'mao_de_obra_qtd'>;
export type ContratoArquivoDraft = Pick<ContratoArquivo, 'contrato_id' | 'pedido_compra_id' | 'nome_arquivo' | 'url_arquivo' | 'tipo_documento'>;

export type ContratoPagamentoEquipe = {
  id: string;
  filial_id: string;
  os_id: string;
  valor: number;
  data_pagamento: string;
  tipo: 'adiantamento' | 'vale' | 'quitacao' | 'premio';
  forma_pagamento?: string;
  comprovante_url?: string;
  obs?: string;
  criado_por?: string;
  criado_em: string;
};

export type ContratoPagamentoEquipeDraft = Pick<ContratoPagamentoEquipe, 'os_id' | 'valor' | 'data_pagamento' | 'tipo' | 'forma_pagamento' | 'comprovante_url' | 'obs'>;
