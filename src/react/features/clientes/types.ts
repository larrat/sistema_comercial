export type ClienteNota = {
  cliente_id: string;
  texto: string;
  data: string;
};

export type ClienteFidelidadeForm = {
  tipo: 'credito' | 'debito' | 'ajuste' | 'estorno';
  pontos: string;
  observacao: string;
};
