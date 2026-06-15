import type { PedidoItem, Produto } from '../../../../types/domain';
import type { ClienteLight } from '../../clientes/services/clientesApi';
import type { PdvProdutoSearchResult } from '../../produtos/services/produtosApi';

export type PdvPaymentMethod =
  | 'dinheiro'
  | 'pix'
  | 'credito'
  | 'debito'
  | 'fiado'
  | 'misto';

export type PdvMixedPaymentMethod = Exclude<PdvPaymentMethod, 'misto'>;

export type PdvMixedPaymentPart = {
  method: PdvMixedPaymentMethod;
  amount: number;
};

export type PdvCartItem = {
  key: string;
  prodId: string;
  nome: string;
  un: string;
  qty: number;
  preco: number;
  custo: number;
  code: string;
  stock: number | null;
  isWeight: boolean;
};

export type PdvQueuedSale = {
  queueId: string;
  payload: {
    id: string;
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
    itens: PedidoItem[];
    total: number;
    origem_venda?: string | null;
    pgto_meta?: Record<string, unknown> | null;
    venda_fechada?: boolean;
    venda_fechada_em?: string | null;
    venda_fechada_por?: string | null;
  };
  createdAt: string;
};

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundPrecision(value: number, precision = 4): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatCurrencyBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function parseDecimalInput(value: string): number {
  const normalized = value.replace(/\s+/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatQty(value: number, isWeight: boolean): string {
  if (isWeight) return value.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export function isWeightUnit(un: string | null | undefined): boolean {
  const normalized = String(un || '')
    .trim()
    .toLowerCase();
  return normalized === 'kg' || normalized === 'g';
}

export function getProdutoDisplayCode(produto: Pick<Produto, 'codigo_barras' | 'sku' | 'codigo_fornecedor'>): string {
  return String(produto.codigo_barras || produto.sku || produto.codigo_fornecedor || '').trim();
}

export function calcPrecoSugerido(prod: Pick<Produto, 'mkv' | 'mka' | 'pfa' | 'custo'>, tipo = 'varejo'): number {
  const mkv = Number(prod.mkv ?? 0);
  const mka = Number(prod.mka ?? 0);
  const pfa = Number(prod.pfa ?? 0);
  const custo = Number(prod.custo ?? 0);

  if (tipo === 'atacado' && (mka > 0 || pfa > 0)) {
    return pfa > 0 ? pfa : custo * (1 + mka / 100);
  }

  return mkv > 0 ? custo * (1 + mkv / 100) : custo;
}

export function createCartItemFromProduto(produto: PdvProdutoSearchResult, tipo = 'varejo'): PdvCartItem {
  return {
    key: globalThis.crypto.randomUUID(),
    prodId: produto.id,
    nome: produto.nome,
    un: produto.un,
    qty: 1,
    preco: roundCurrency(calcPrecoSugerido(produto, tipo)),
    custo: Number(produto.custo ?? 0),
    code: getProdutoDisplayCode(produto),
    stock: Number.isFinite(Number(produto.esal)) ? Number(produto.esal) : null,
    isWeight: isWeightUnit(produto.un)
  };
}

export function calculateCartTotals(items: PdvCartItem[], discountValue: number) {
  const subtotal = roundCurrency(items.reduce((acc, item) => acc + item.qty * item.preco, 0));
  const safeDiscount = Math.max(0, Math.min(roundCurrency(discountValue), subtotal));
  const total = roundCurrency(subtotal - safeDiscount);
  const itemCount = items.reduce((acc, item) => acc + item.qty, 0);
  return {
    subtotal,
    discountValue: safeDiscount,
    total,
    itemCount
  };
}

export function validateMixedPayments(parts: PdvMixedPaymentPart[], total: number) {
  const validParts = parts
    .filter((part) => part.method && Number(part.amount) > 0)
    .map((part) => ({ ...part, amount: roundCurrency(part.amount) }));
  const paid = roundCurrency(validParts.reduce((acc, part) => acc + part.amount, 0));
  const expected = roundCurrency(total);
  const difference = roundCurrency(expected - paid);
  return {
    parts: validParts,
    paid,
    expected,
    difference,
    isValid: Math.abs(difference) < 0.01 && validParts.length > 0 && validParts.length <= 3
  };
}

export function normalizePrazoCliente(cliente: ClienteLight | null): string {
  const prazo = String(cliente?.prazo || '').trim();
  if (prazo === '7d' || prazo === '15d' || prazo === '30d' || prazo === '60d') return prazo;
  return '30d';
}

export function buildPedidoItensFromCart(items: PdvCartItem[], discountValue: number): PedidoItem[] {
  const subtotal = items.reduce((acc, item) => acc + item.qty * item.preco, 0);
  const safeDiscount = Math.max(0, Math.min(discountValue, subtotal));

  let consumedDiscount = 0;
  return items.map((item, index) => {
    const gross = item.qty * item.preco;
    const isLast = index === items.length - 1;
    const proportionalDiscount = isLast
      ? roundCurrency(safeDiscount - consumedDiscount)
      : roundCurrency(subtotal > 0 ? (gross / subtotal) * safeDiscount : 0);
    consumedDiscount = roundCurrency(consumedDiscount + proportionalDiscount);
    const netSubtotal = Math.max(0, roundCurrency(gross - proportionalDiscount));
    const unitPrice = item.qty > 0 ? roundPrecision(netSubtotal / item.qty, item.isWeight ? 6 : 4) : 0;

    return {
      prodId: item.prodId,
      nome: item.nome,
      un: item.un,
      qty: item.qty,
      preco: unitPrice,
      custo: item.custo,
      custo_base: item.custo,
      preco_base: item.preco,
      orig: 'estoque'
    };
  });
}

export function mapPdvPaymentToPedido(paymentMethod: PdvPaymentMethod): string {
  if (paymentMethod === 'dinheiro') return 'a_vista';
  if (paymentMethod === 'pix') return 'pix';
  if (paymentMethod === 'credito') return 'credito';
  if (paymentMethod === 'debito') return 'debito';
  if (paymentMethod === 'fiado') return 'fiado';
  return 'misto';
}
