import type { Pedido, PedidoItem, Produto, Rca } from '../../../../types/domain';
import type { ClienteLight } from '../services/clientesLightApi';

export type PedidoFormErrors = {
  cli?: string;
  itens?: string;
  geral?: string;
};

export type PedidoFormValidationResult =
  | { ok: true; cliente: ClienteLight }
  | {
      ok: false;
      errors: PedidoFormErrors;
      reason: 'cliente_obrigatorio' | 'cliente_invalido' | 'itens_obrigatorios';
      fields: string[];
    };

export function getTodayISODate(): string {
  return new Date().toISOString().split('T')[0];
}

export function getNextPedidoNumber(pedidos: Pedido[]): number {
  const nums = pedidos.map((p) => p.num).filter((n) => typeof n === 'number' && !isNaN(n));
  return nums.length ? Math.max(...nums) + 1 : 1;
}

export function formatPedidoCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function normalizePedidoPrazo(value?: string | null): string {
  if (value === '7d' || value === '15d' || value === '30d' || value === '60d') return value;
  return 'imediato';
}

export function parsePedidoItens(raw: Pedido['itens'] | undefined): PedidoItem[] {
  if (Array.isArray(raw)) return raw as PedidoItem[];
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as PedidoItem[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function calculatePedidoTotal(itens: PedidoItem[]): number {
  return itens.reduce((acc, item) => acc + item.qty * item.preco, 0);
}

export function calculatePedidoLucroTotal(itens: PedidoItem[]): number {
  return itens.reduce((acc, item) => acc + (item.preco - item.custo) * item.qty, 0);
}

export function calculatePedidoItemSubtotal(item: PedidoItem): number {
  return item.qty * item.preco;
}

export function calculatePedidoItemLucro(item: PedidoItem): number {
  return (item.preco - item.custo) * item.qty;
}

export function calculatePedidoItemMargem(item: PedidoItem): number {
  return item.preco > 0 ? ((item.preco - item.custo) / item.preco) * 100 : 0;
}

export function calcPrecoSugerido(prod: Produto, tipo: string): number {
  const mkv = prod.mkv ?? 0;
  const mka = prod.mka ?? 0;
  const pfa = prod.pfa ?? 0;
  const custo = prod.custo ?? 0;

  if (tipo === 'atacado' && (mka > 0 || pfa > 0)) {
    return pfa > 0 ? pfa : custo * (1 + mka / 100);
  }
  return mkv > 0 ? custo * (1 + mkv / 100) : custo;
}

export function validatePedidoForm(
  rawCliente: string,
  clientes: ClienteLight[],
  itens: PedidoItem[],
  pgto: string,
  findCliente: (clientes: ClienteLight[], raw: string) => ClienteLight | null
): PedidoFormValidationResult {
  const cliTrimmed = rawCliente.trim();
  if (!cliTrimmed) {
    return {
      ok: false,
      errors: { cli: 'Selecione um cliente para continuar.' },
      reason: 'cliente_obrigatorio',
      fields: ['cli']
    };
  }

  const cliente = findCliente(clientes, cliTrimmed);
  if (!cliente) {
    return {
      ok: false,
      errors: { cli: 'Cliente inválido. Escolha um cliente já cadastrado na lista.' },
      reason: 'cliente_invalido',
      fields: ['cli']
    };
  }

  if (itens.length === 0) {
    return {
      ok: false,
      errors: { itens: 'Adicione pelo menos 1 item antes de salvar o pedido.' },
      reason: 'itens_obrigatorios',
      fields: ['itens']
    };
  }

  // Trava de Segurança: Inadimplência
  const isVendaPrazo = !['a_vista', 'pix'].includes(pgto || 'a_vista');
  if (cliente.is_defaulter && isVendaPrazo) {
    return {
      ok: false,
      errors: { cli: 'Venda bloqueada: Cliente inadimplente. Use PIX ou À Vista.' },
      reason: 'cliente_invalido',
      fields: ['cli']
    };
  }

  return { ok: true, cliente };
}

export function resolveRcaNome(rcas: Rca[], rcaId: string, cliente: ClienteLight): string {
  const rca = rcas.find((item) => item.id === rcaId);
  return rca?.nome ?? cliente.rca_nome ?? '';
}
