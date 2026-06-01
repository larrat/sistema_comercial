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

class PdvOfflineDatabase extends Dexie {
  produtos!: Table<OfflineProduto, string>;
  clientes!: Table<OfflineCliente, string>;
  pedidos!: Table<OfflinePedido, string>;

  constructor() {
    super('PdvOfflineDatabase');
    this.version(1).stores({
      produtos: 'id, filial_id, nome, codigo_barras, sku',
      clientes: 'id, filial_id, nome, cpf_cnpj',
      pedidos: 'id, filial_id, num, sync_status, criado_em'
    });
  }
}

export const db = new PdvOfflineDatabase();
