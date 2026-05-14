export type OfxTransaction = {
  id: string;
  data: string;
  valor: number;
  descricao: string;
};

export const ofxService = {
  /**
   * Parses an OFX string into an array of transactions.
   * Note: This is a simplified parser for demonstration/MVP.
   * A real production app would use a more robust library like 'ofx-js'.
   */
  parse(content: string): OfxTransaction[] {
    const transactions: OfxTransaction[] = [];
    const stmtTrnMatches = content.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g);

    if (!stmtTrnMatches) return [];

    for (const stmt of stmtTrnMatches) {
      const id = this.extractTag(stmt, 'FITID');
      const dataRaw = this.extractTag(stmt, 'DTPOSTED');
      const valorRaw = this.extractTag(stmt, 'TRNAMT');
      const descricao = this.extractTag(stmt, 'MEMO') || this.extractTag(stmt, 'NAME') || '';

      if (id && dataRaw && valorRaw) {
        transactions.push({
          id,
          data: this.formatOfxDate(dataRaw),
          valor: parseFloat(valorRaw.replace(',', '.')),
          descricao: descricao.trim()
        });
      }
    }

    return transactions;
  },

  extractTag(content: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>([^<\\n]*)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  },

  formatOfxDate(raw: string): string {
    // YYYYMMDDHHMMSS -> YYYY-MM-DD
    const year = raw.substring(0, 4);
    const month = raw.substring(4, 6);
    const day = raw.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
};
