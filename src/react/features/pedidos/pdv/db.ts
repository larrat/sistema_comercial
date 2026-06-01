import Dexie, { type Table } from 'dexie';

export interface OfflineProduto {
  id: string;
  filial_id: string;
  nome: string;
  codigo_barras: string | null;
  sku: string | null;
  codigo_fornecedor: string | null;
  preco: number;
  custo: number;
  un: string;
  esal: number;
  mkv: number;
  mka: number;
  pfa: number;
}

export interface OfflineCliente {
  id: string;
  filial_id: string;
  nome: string;
  cpf_cnpj: string | null;
  prazo: string | null;
  email: string | null;
  telefone: string | null;
}

export interface OfflinePedido {
  id: string; // UUID v4
  filial_id: string;
  num: number;
  cli: string;
  cliente_id: string | null;
  rca_id: string | null;
  rca_nome: string | null;
  data: string;
  status: string;
  pgto: string;
  prazo: string;
  tipo: string;
  obs: string;
  itens: any[]; // PedidoItem[]
  total: number;
  sync_status: 'pending' | 'synced' | 'failed';
  sync_error?: string | null;
  criado_em: string;
}

export interface CertificadoLocal {
  id: string; // ex: 'cert_padrao'
  filial_id: string;
  cnpj: string;
  razao_social: string;
  vencimento: string;
  privateKey: CryptoKey;
  certificadoX509: string; // string PEM
}

export interface NfceContingencia {
  id: string;
  pedido_id: string;
  filial_id: string;
  chave_acesso: string;
  xml_assinado: string;
  qrcode_url: string;
  status: 'pendente' | 'transmitido' | 'erro';
  motivo_erro?: string | null;
  criado_em: string;
}

class PdvOfflineDatabase extends Dexie {
  produtos!: Table<OfflineProduto, string>;
  clientes!: Table<OfflineCliente, string>;
  pedidos!: Table<OfflinePedido, string>;
  certificados!: Table<CertificadoLocal, string>;
  nfce_contingencia!: Table<NfceContingencia, string>;

  constructor() {
    super('PdvOfflineDatabase');
    this.version(1).stores({
      produtos: 'id, filial_id, nome, codigo_barras, sku',
      clientes: 'id, filial_id, nome, cpf_cnpj',
      pedidos: 'id, filial_id, num, sync_status, criado_em'
    });
    
    this.version(2).stores({
      produtos: 'id, filial_id, nome, codigo_barras, sku',
      clientes: 'id, filial_id, nome, cpf_cnpj',
      pedidos: 'id, filial_id, num, sync_status, criado_em',
      certificados: 'id, filial_id',
      nfce_contingencia: 'id, pedido_id, filial_id, status, criado_em'
    });
  }
}

export const db = new PdvOfflineDatabase();
