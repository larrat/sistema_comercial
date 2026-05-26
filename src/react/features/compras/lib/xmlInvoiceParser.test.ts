import { describe, it, expect } from 'vitest';
import { parseNFXML } from './xmlInvoiceParser';

describe('xmlInvoiceParser', () => {
  it('deve extrair emitente e itens corretamente de um XML NF-e valido', () => {
    const validXML = `
      <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
        <NFe>
          <infNFe>
            <emit>
              <CNPJ>12345678000199</CNPJ>
              <xNome>DISTRIBUIDORA DE ROUPAS SA</xNome>
            </emit>
            <det n="1">
              <prod>
                <cProd>SKU-100</cProd>
                <xProd>CAMISETA ALGODAO NEXUS</xProd>
                <qCom>15.0000</qCom>
                <vUnCom>45.5000</vUnCom>
                <NCM>61091000</NCM>
                <cEAN>7891234567890</cEAN>
              </prod>
            </det>
            <det n="2">
              <prod>
                <cProd>SKU-200</cProd>
                <xProd>CALCA JEANS SLIM</xProd>
                <qCom>8.0000</qCom>
                <vUnCom>89.9000</vUnCom>
                <NCM>62034200</NCM>
                <cEAN>SEM GTIN</cEAN>
              </prod>
            </det>
          </infNFe>
        </NFe>
      </nfeProc>
    `;

    const result = parseNFXML(validXML);

    expect(result.cnpjEmitente).toBe('12345678000199');
    expect(result.nomeEmitente).toBe('DISTRIBUIDORA DE ROUPAS SA');
    expect(result.itens).toHaveLength(2);

    expect(result.itens[0]).toEqual({
      cProd: 'SKU-100',
      xProd: 'CAMISETA ALGODAO NEXUS',
      qCom: 15,
      vUnCom: 45.5,
      ncm: '61091000',
      cEAN: '7891234567890'
    });

    expect(result.itens[1]).toEqual({
      cProd: 'SKU-200',
      xProd: 'CALCA JEANS SLIM',
      qCom: 8,
      vUnCom: 89.9,
      ncm: '62034200',
      cEAN: undefined
    });
  });

  it('deve disparar erro ao tentar ler um XML mal-formado', () => {
    const brokenXML = `<nfeProc><emit><CNPJ>123</CNPJ></emit>`; // tags nao fechadas
    expect(() => parseNFXML(brokenXML)).toThrow();
  });

  it('deve disparar erro se o elemento emitente <emit> nao for encontrado', () => {
    const missingEmitXML = `
      <nfeProc>
        <det n="1">
          <prod>
            <cProd>SKU-100</cProd>
            <xProd>PROD A</xProd>
            <qCom>1.00</qCom>
            <vUnCom>10.00</vUnCom>
          </prod>
        </det>
      </nfeProc>
    `;
    expect(() => parseNFXML(missingEmitXML)).toThrow('elemento <emit> não encontrado');
  });
});
