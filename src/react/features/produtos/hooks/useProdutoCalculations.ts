import type { Produto } from '../../../../types/domain';
import type { ProdutoFormValues } from '../types';

export function priceToMarkup(custo: number, preco: number): number {
  if (custo <= 0 || preco <= 0) return 0;
  return (preco / custo - 1) * 100;
}

export function priceToMargin(custo: number, preco: number): number {
  if (custo <= 0 || preco <= 0) return 0;
  return ((preco - custo) / preco) * 100;
}

export function markupToPrice(custo: number, markup: number): number {
  if (custo <= 0) return 0;
  return custo * (1 + markup / 100);
}

export function markupToMargin(markup: number): number {
  if (markup <= 0) return 0;
  return markup / (1 + markup / 100);
}

export function marginToMarkup(margin: number): number {
  if (margin <= 0 || margin >= 100) return 0;
  return margin / (1 - margin / 100);
}

export type PriceField = 'preco' | 'markup' | 'margem';

export type SyncedPriceState = {
  preco: string;
  markup: string;
  margem: string;
};

/** Recalcula os três campos de preço a partir de qual campo mudou. */
export function syncPriceFields(
  changed: PriceField,
  values: SyncedPriceState,
  custo: number
): SyncedPriceState {
  const preco = parseFloat(values.preco) || 0;
  const markup = parseFloat(values.markup) || 0;
  const margem = parseFloat(values.margem) || 0;

  if (changed === 'markup' && markup > 0) {
    const newMargem = markupToMargin(markup);
    const newPreco = custo > 0 ? markupToPrice(custo, markup) : preco;
    return {
      markup: markup.toFixed(1),
      margem: newMargem.toFixed(1),
      preco: newPreco > 0 ? newPreco.toFixed(2) : values.preco
    };
  }

  if (changed === 'margem' && margem > 0) {
    const newMarkup = marginToMarkup(margem);
    const newPreco = custo > 0 ? markupToPrice(custo, newMarkup) : preco;
    return {
      markup: newMarkup.toFixed(1),
      margem: margem.toFixed(1),
      preco: newPreco > 0 ? newPreco.toFixed(2) : values.preco
    };
  }

  if (changed === 'preco' && custo > 0 && preco > 0) {
    const newMarkup = priceToMarkup(custo, preco);
    const newMargem = priceToMargin(custo, preco);
    return {
      preco: values.preco,
      markup: newMarkup.toFixed(1),
      margem: newMargem.toFixed(1)
    };
  }

  return values;
}

/** Recalcula preços varejo e atacado a partir de um novo custo. */
export function recalcFromCost(
  custo: number,
  varejo: SyncedPriceState,
  atacado: SyncedPriceState
): { varejo: SyncedPriceState; atacado: SyncedPriceState } {
  const mkv = parseFloat(varejo.markup) || 0;
  const mka = parseFloat(atacado.markup) || 0;

  const newVarejo =
    mkv > 0
      ? syncPriceFields('markup', { ...varejo, markup: String(mkv) }, custo)
      : varejo;

  const newAtacado =
    mka > 0
      ? syncPriceFields('markup', { ...atacado, markup: String(mka) }, custo)
      : atacado;

  return { varejo: newVarejo, atacado: newAtacado };
}

/** Converte valores do formulário para o objeto Produto do banco. */
export function formValuesToProduto(
  values: ProdutoFormValues,
  filialId: string,
  existing: Produto | null
): Produto {
  const custo = parseFloat(values.custo) || 0;
  const precoVarejo = parseFloat(values.precoVarejo || '0') || 0;
  const mkv =
    precoVarejo > 0 && custo > 0
      ? (precoVarejo / custo - 1) * 100
      : parseFloat(values.markupVarejo || '0') || 0;

  return {
    id: (values.id as string) || crypto.randomUUID(),
    filial_id: filialId,
    produto_pai_id: values.produto_pai_id ?? null,
    nome: values.nome.trim(),
    sku: values.sku?.trim() || null,
    un: values.un || 'un',
    cat: values.cat?.trim() || null,
    custo,
    mkv,
    mka: parseFloat(values.markupAtacado || '0') || 0,
    pfa: parseFloat(values.precoFixoAtacado || '0') || 0,
    dv: parseFloat(values.descontoVarejo || '0') || 0,
    da: parseFloat(values.descontoAtacado || '0') || 0,
    qtmin: parseFloat(values.qtmin || '0') || 0,
    emin: parseFloat(values.emin || '0') || 0,
    esal: parseFloat(values.esal || '0') || 0,
    ecm: parseFloat(values.ecm || '0') || custo,
    hist_cot: existing?.hist_cot || [],
    genero: (values.genero as any) ?? null,
    tamanho: values.tamanho ?? null,
    foto_url: values.foto_url ?? null,
    qualidade: (values as any).qualidade ?? null,
    ncm: (values as any).ncm ?? null,
    cest: (values as any).cest ?? null,
    origem: (values as any).origem ? parseInt((values as any).origem, 10) : 0,
    cfop_padrao: (values as any).cfop_padrao ?? null,
    is_active: true,
    is_sample: !!values.is_sample
  };
}
