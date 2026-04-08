// @ts-check

export function findHeader(headers, keywords = []){
  return Math.max(
    -1,
    headers.findIndex(h =>
      keywords.some(k => String(h.label || '').toLowerCase().includes(String(k).toLowerCase()))
    )
  );
}

export function buildDefaultMapping(headers){
  const idxDescricao = findHeader(headers, ['descrição','descricao','nome','produto','item']);
  const idxCategoria = findHeader(headers, ['categoria','família','familia','grupo','linha']);
  const idxTabela = findHeader(headers, ['tabela','bruto','valor tabela','preço tabela','preco tabela']);
  const idxDesconto = findHeader(headers, ['desconto','%']);
  const idxPrecoLiq = findHeader(headers, ['valor un liq','valor unitário','valor unitario','líquido','liquido','preço','preco','unit']);

  return {
    idxDescricao,
    idxCategoria,
    idxTabela,
    idxDesconto,
    idxPrecoLiq
  };
}
