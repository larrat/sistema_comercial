export interface ParsedDuplicata {
  nDup: string;
  dVenc: string;
  vDup: number;
}

export interface ParsedInvoiceItem {
  cProd: string;
  xProd: string;
  qCom: number;
  vUnCom: number;
  ncm?: string;
  cEAN?: string;
  cfop?: string;
  cst?: string;
  vIPI?: number;
}

export interface ParsedInvoice {
  chNFe: string;
  cnpjEmitente: string;
  nomeEmitente: string;
  vNF: number;
  vFrete: number;
  vOutro: number;
  vDesc: number;
  itens: ParsedInvoiceItem[];
  duplicatas: ParsedDuplicata[];
}

export function parseNFXML(xmlText: string): ParsedInvoice {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
  
  const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
  if (parserError) {
    throw new Error('Arquivo XML inválido ou mal-formatado.');
  }

  // Identificação principal
  const chNFe = xmlDoc.getElementsByTagName('chNFe')[0]?.textContent || '';
  
  const emit = xmlDoc.getElementsByTagName('emit')[0];
  if (!emit) {
    throw new Error('Estrutura da NF-e inválida: elemento <emit> não encontrado.');
  }

  const cnpj = emit.getElementsByTagName('CNPJ')[0]?.textContent || '';
  const xNome = emit.getElementsByTagName('xNome')[0]?.textContent || '';

  // Totais da Nota
  const total = xmlDoc.getElementsByTagName('total')[0];
  const ICMSTot = total?.getElementsByTagName('ICMSTot')[0];
  
  const vNF = parseFloat(ICMSTot?.getElementsByTagName('vNF')[0]?.textContent || '0');
  const vFrete = parseFloat(ICMSTot?.getElementsByTagName('vFrete')[0]?.textContent || '0');
  const vOutro = parseFloat(ICMSTot?.getElementsByTagName('vOutro')[0]?.textContent || '0');
  const vDesc = parseFloat(ICMSTot?.getElementsByTagName('vDesc')[0]?.textContent || '0');
  
  // Duplicatas (Cobrança)
  const cobr = xmlDoc.getElementsByTagName('cobr')[0];
  const duplicatasElements = cobr?.getElementsByTagName('dup') || [];
  const duplicatas: ParsedDuplicata[] = [];
  
  for (let i = 0; i < duplicatasElements.length; i++) {
    const dup = duplicatasElements[i];
    duplicatas.push({
      nDup: dup.getElementsByTagName('nDup')[0]?.textContent || '',
      dVenc: dup.getElementsByTagName('dVenc')[0]?.textContent || '',
      vDup: parseFloat(dup.getElementsByTagName('vDup')[0]?.textContent || '0')
    });
  }
  
  // Itens da Nota
  const dets = xmlDoc.getElementsByTagName('det');
  const itens: ParsedInvoiceItem[] = [];

  for (let i = 0; i < dets.length; i++) {
    const det = dets[i];
    const prod = det.getElementsByTagName('prod')[0];
    const imposto = det.getElementsByTagName('imposto')[0];
    
    if (!prod) continue;

    const cProd = prod.getElementsByTagName('cProd')[0]?.textContent || '';
    const xProd = prod.getElementsByTagName('xProd')[0]?.textContent || '';
    const qComStr = prod.getElementsByTagName('qCom')[0]?.textContent || '0';
    const vUnComStr = prod.getElementsByTagName('vUnCom')[0]?.textContent || '0';
    const ncm = prod.getElementsByTagName('NCM')[0]?.textContent || undefined;
    const cEAN = prod.getElementsByTagName('cEAN')[0]?.textContent || undefined;
    const cfop = prod.getElementsByTagName('CFOP')[0]?.textContent || undefined;
    
    // Tentativa de extrair CST ou CSOSN do ICMS
    let cst;
    const icms = imposto?.getElementsByTagName('ICMS')[0];
    if (icms) {
       // Pode estar em ICMS00, ICMS10, ICSM40, ICMS20, etc. ou SN (ICMSSN101, etc)
       // Vamos apenas procurar a primeira tag CST ou CSOSN encontrada dentro do ICMS
       cst = icms.getElementsByTagName('CST')[0]?.textContent || icms.getElementsByTagName('CSOSN')[0]?.textContent || undefined;
    }
    
    const vIPI = parseFloat(imposto?.getElementsByTagName('IPI')[0]?.getElementsByTagName('vIPI')[0]?.textContent || '0');

    itens.push({
      cProd,
      xProd,
      qCom: parseFloat(qComStr) || 0,
      vUnCom: parseFloat(vUnComStr) || 0,
      ncm,
      cEAN: cEAN && cEAN !== 'SEM GTIN' ? cEAN : undefined,
      cfop,
      cst,
      vIPI: vIPI || undefined
    });
  }

  return {
    chNFe,
    cnpjEmitente: cnpj,
    nomeEmitente: xNome,
    vNF,
    vFrete,
    vOutro,
    vDesc,
    itens,
    duplicatas
  };
}
