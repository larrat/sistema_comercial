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
