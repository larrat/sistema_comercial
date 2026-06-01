import { create } from 'xmlbuilder2';
import { type OfflinePedido } from './db';
import { getActiveCertificate } from './certificateService';
import { format } from 'date-fns';

// Calculates the Modulo 11 check digit (DV) for the Access Key
export function calcularDigitoVerificador(chave43: string): number {
  let soma = 0;
  let peso = 2;

  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += parseInt(chave43.charAt(i), 10) * peso;
    peso++;
    if (peso > 9) peso = 2;
  }

  const resto = soma % 11;
  const dv = 11 - resto;
  return dv >= 10 ? 0 : dv;
}

// Generate the 44-digit Access Key for NFC-e
export function gerarChaveAcessoNfce(
  uf: string,
  dataEmissao: Date,
  cnpj: string,
  modelo: string = '65',
  serie: string = '1',
  numero: string,
  tpEmis: string = '9', // 9 = Contingência Offline NFC-e
  codigoAleatorio: string
): { chave: string; dv: string; chaveSemDv: string } {
  const anoMes = format(dataEmissao, 'yyMM');
  const cnpjPadded = cnpj.padStart(14, '0');
  const seriePadded = serie.padStart(3, '0');
  const numPadded = numero.padStart(9, '0');
  const codAleatorioPadded = codigoAleatorio.padStart(8, '0');

  const chave43 = `${uf}${anoMes}${cnpjPadded}${modelo}${seriePadded}${numPadded}${tpEmis}${codAleatorioPadded}`;
  const dv = calcularDigitoVerificador(chave43).toString();

  return {
    chave: `${chave43}${dv}`,
    chaveSemDv: chave43,
    dv
  };
}

// Generate the XML structure using xmlbuilder2
export async function buildNfceXml(pedido: OfflinePedido, numNfce: string) {
  // Hardcoded values for demonstration; in a real app, these come from filial settings
  const cUF = '35'; // SP as example
  const natOp = 'Venda de Mercadoria';
  const mod = '65';
  const serie = '1';
  const dataEmissao = new Date();
  const dhEmi = dataEmissao.toISOString().substring(0, 19) + '-03:00'; // SEFAZ format
  const tpEmis = '9'; // Contingencia Offline
  
  const cNF = Math.floor(Math.random() * 99999999).toString();
  
  const cert = await getActiveCertificate();
  if (!cert) throw new Error('Certificado Digital não encontrado.');
  const cnpjEmi = cert.cnpj.replace(/\D/g, '');
  
  const chaves = gerarChaveAcessoNfce(cUF, dataEmissao, cnpjEmi, mod, serie, numNfce, tpEmis, cNF);
  const chNFe = chaves.chave;
  const idNFe = `NFe${chNFe}`;

  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('NFe', { xmlns: 'http://www.portalfiscal.inf.br/nfe' })
      .ele('infNFe', { Id: idNFe, versao: '4.00' })
        
        // IDE: Identificação da NFe
        .ele('ide')
          .ele('cUF').txt(cUF).up()
          .ele('cNF').txt(cNF.padStart(8, '0')).up()
          .ele('natOp').txt(natOp).up()
          .ele('mod').txt(mod).up()
          .ele('serie').txt(serie).up()
          .ele('nNF').txt(numNfce).up()
          .ele('dhEmi').txt(dhEmi).up()
          .ele('tpNF').txt('1').up() // 1=Saida
          .ele('idDest').txt('1').up() // 1=Operacao Interna
          .ele('cMunFG').txt('3550308').up() // Example IBGE SP
          .ele('tpImp').txt('4').up() // 4=DANFE NFC-e
          .ele('tpEmis').txt(tpEmis).up() 
          .ele('cDV').txt(chaves.dv).up()
          .ele('tpAmb').txt('2').up() // 2=Homologação, 1=Produção
          .ele('finNFe').txt('1').up() // 1=Normal
          .ele('indFinal').txt('1').up() // 1=Consumidor Final
          .ele('indPres').txt('1').up() // 1=Presencial
          .ele('procEmi').txt('0').up()
          .ele('verProc').txt('NexusERP 1.0').up()
        .up()

        // EMI: Emitente
        .ele('emit')
          .ele('CNPJ').txt(cnpjEmi).up()
          .ele('xNome').txt(cert.razao_social).up()
          .ele('enderEmit')
            .ele('xLgr').txt('Rua Exemplo').up()
            .ele('nro').txt('123').up()
            .ele('xBairro').txt('Centro').up()
            .ele('cMun').txt('3550308').up()
            .ele('xMun').txt('Sao Paulo').up()
            .ele('UF').txt('SP').up()
            .ele('CEP').txt('01000000').up()
          .up()
          .ele('IE').txt('123456789012').up() // Example IE
          .ele('CRT').txt('1').up() // 1=Simples Nacional
        .up()

        // DEST: Destinatário (Optional for NFC-e up to a certain value)
        // Ignoring DEST to simplify NFC-e contingency

        // DET: Detalhamento dos Itens
        // Here we loop through `pedido.itens`
        ;

  // Append items
  let nItem = 1;
  let totalProdutos = 0;
  for (const item of pedido.itens) {
    const vProd = (item.preco * item.qty).toFixed(2);
    totalProdutos += parseFloat(vProd);

    const det = root.ele('det', { nItem: nItem.toString() })
      .ele('prod')
        .ele('cProd').txt(item.prodId || `PROD${nItem}`).up()
        .ele('cEAN').txt('SEM GTIN').up()
        .ele('xProd').txt('Produto de Teste ' + nItem).up() // Should be from DB
        .ele('NCM').txt('00000000').up() // Should be resolved
        .ele('CFOP').txt('5102').up()
        .ele('uCom').txt('UN').up()
        .ele('qCom').txt(item.qty.toFixed(4)).up()
        .ele('vUnCom').txt(item.preco.toFixed(4)).up()
        .ele('vProd').txt(vProd).up()
        .ele('cEANTrib').txt('SEM GTIN').up()
        .ele('uTrib').txt('UN').up()
        .ele('qTrib').txt(item.qty.toFixed(4)).up()
        .ele('vUnTrib').txt(item.preco.toFixed(4)).up()
        .ele('indTot').txt('1').up()
      .up()
      .ele('imposto')
        .ele('ICMS')
          .ele('ICMSSN102') // Simples Nacional (example)
            .ele('orig').txt('0').up()
            .ele('CSOSN').txt('102').up()
          .up()
        .up()
        .ele('PIS')
          .ele('PISOutr')
            .ele('CST').txt('99').up()
            .ele('vBC').txt('0.00').up()
            .ele('pPIS').txt('0.00').up()
            .ele('vPIS').txt('0.00').up()
          .up()
        .up()
        .ele('COFINS')
          .ele('COFINSOutr')
            .ele('CST').txt('99').up()
            .ele('vBC').txt('0.00').up()
            .ele('pCOFINS').txt('0.00').up()
            .ele('vCOFINS').txt('0.00').up()
          .up()
        .up()
      .up();
    nItem++;
  }

  // TOTAL: Totais da NFe
  root.ele('total')
    .ele('ICMSTot')
      .ele('vBC').txt('0.00').up()
      .ele('vICMS').txt('0.00').up()
      .ele('vICMSDeson').txt('0.00').up()
      .ele('vFCP').txt('0.00').up()
      .ele('vBCST').txt('0.00').up()
      .ele('vST').txt('0.00').up()
      .ele('vFCPST').txt('0.00').up()
      .ele('vFCPSTRet').txt('0.00').up()
      .ele('vProd').txt(totalProdutos.toFixed(2)).up()
      .ele('vFrete').txt('0.00').up()
      .ele('vSeg').txt('0.00').up()
      .ele('vDesc').txt('0.00').up()
      .ele('vII').txt('0.00').up()
      .ele('vIPI').txt('0.00').up()
      .ele('vIPIDevol').txt('0.00').up()
      .ele('vPIS').txt('0.00').up()
      .ele('vCOFINS').txt('0.00').up()
      .ele('vOutro').txt('0.00').up()
      .ele('vNF').txt(totalProdutos.toFixed(2)).up()
      .ele('vTotTrib').txt('0.00').up()
    .up()
  .up();

  // PAG: Pagamentos
  root.ele('pag')
    .ele('detPag')
      .ele('tPag').txt('01').up() // 01=Dinheiro
      .ele('vPag').txt(totalProdutos.toFixed(2)).up()
    .up()
  .up();

  const xmlStr = root.end({ prettyPrint: false });
  return {
    xmlString: xmlStr,
    chaveAcesso: chNFe,
    uriId: idNFe
  };
}
