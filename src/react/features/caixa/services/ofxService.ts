import { parse as parseOfx } from 'ofx-js';

export type OfxTransaction = {
  id: string;
  data: string;
  valor: number;
  descricao: string;
};

export const ofxService = {
  /**
   * Parses an OFX string into an array of transactions using ofx-js.
   */
  async parse(content: string): Promise<OfxTransaction[]> {
    try {
      const data = await parseOfx(content);

      // Navigate to the transactions list
      // Note: OFX structures can vary slightly between banks
      const bankMsgs = data?.OFX?.BANKMSGSRSV1;
      const stmtTrnRs = Array.isArray(bankMsgs?.STMTTRNRS)
        ? bankMsgs.STMTTRNRS[0]
        : bankMsgs?.STMTTRNRS;
      const stmtRs = stmtTrnRs?.STMTRS;
      const tranList = stmtRs?.BANKTRANLIST?.STMTTRN;

      if (!tranList) return [];

      const transactions = (Array.isArray(tranList) ? tranList : [tranList]) as Array<{
        FITID: string;
        DTPOSTED: string;
        TRNAMT: string;
        MEMO?: string;
        NAME?: string;
      }>;

      return transactions.map((t) => ({
        id: t.FITID,
        data: this.formatOfxDate(t.DTPOSTED),
        valor: parseFloat(t.TRNAMT),
        descricao: (t.MEMO || t.NAME || '').trim()
      }));
    } catch (err) {
      console.error('Error parsing OFX with ofx-js:', err);
      throw new Error('Falha ao processar arquivo OFX.', { cause: err });
    }
  },

  formatOfxDate(raw: string): string {
    if (!raw) return '';
    // YYYYMMDDHHMMSS -> YYYY-MM-DD
    const year = raw.substring(0, 4);
    const month = raw.substring(4, 6);
    const day = raw.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
};
