export type CrmEstagio = 'novo' | 'visita' | 'orcamento' | 'negociacao' | 'fechado' | 'perdido';

export interface CrmOportunidade {
  id: string;
  filial_id: string;
  cliente_id: string | null;
  nome_lead: string;
  telefone: string | null;
  endereco_obra: string | null;
  estagio: CrmEstagio;
  valor_estimado: number;
  tags: string[] | null;
  criado_por: string | null;
  atualizado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface CrmOportunidadeHistorico {
  id: string;
  oportunidade_id: string;
  filial_id: string;
  tipo: 'nota' | 'mudanca_estagio' | 'visita_agendada';
  conteudo: string;
  criado_por: string | null;
  criado_em: string;
}

export interface CrmOportunidadeDraft {
  id?: string;
  nome_lead: string;
  telefone: string;
  endereco_obra: string;
  valor_estimado: number;
  tags: string[];
}
