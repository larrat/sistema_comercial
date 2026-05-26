export interface ParsedInvoiceItem {
  cProd: string;
  xProd: string;
  qCom: number;
  vUnCom: number;
  ncm?: string;
  cEAN?: string;
}

export interface ParsedInvoice {
  cnpjEmitente: string;
  nomeEmitente: string;
  itens: ParsedInvoiceItem[];
}

export function parseNFXML(xmlText: string): ParsedInvoice {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
  
  // Check for XML parsing errors
  const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
  if (parserError) {
    throw new Error('Arquivo XML inválido ou mal-formatado.');
  }

  // Extract emitter (Supplier)
  const emit = xmlDoc.getElementsByTagName('emit')[0];
  if (!emit) {
    throw new Error('Estrutura da NF-e inválida: elemento <emit> não encontrado.');
  }

  const cnpj = emit.getElementsByTagName('CNPJ')[0]?.textContent || '';
  const xNome = emit.getElementsByTagName('xNome')[0]?.textContent || '';
  
  // Extract items
  const dets = xmlDoc.getElementsByTagName('det');
  const itens: ParsedInvoiceItem[] = [];

  for (let i = 0; i < dets.length; i++) {
    const det = dets[i];
    const prod = det.getElementsByTagName('prod')[0];
    if (!prod) continue;

    const cProd = prod.getElementsByTagName('cProd')[0]?.textContent || '';
    const xProd = prod.getElementsByTagName('xProd')[0]?.textContent || '';
    const qComStr = prod.getElementsByTagName('qCom')[0]?.textContent || '0';
    const vUnComStr = prod.getElementsByTagName('vUnCom')[0]?.textContent || '0';
    const ncm = prod.getElementsByTagName('NCM')[0]?.textContent || undefined;
    const cEAN = prod.getElementsByTagName('cEAN')[0]?.textContent || undefined;

    itens.push({
      cProd,
      xProd,
      qCom: parseFloat(qComStr) || 0,
      vUnCom: parseFloat(vUnComStr) || 0,
      ncm,
      cEAN: cEAN && cEAN !== 'SEM GTIN' ? cEAN : undefined
    });
  }

  return {
    cnpjEmitente: cnpj,
    nomeEmitente: xNome,
    itens
  };
}
