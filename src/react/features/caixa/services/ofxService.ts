import { parse as parseOfx } from 'ofx-js';

export type OfxTransaction = {
  id: string;
  data: string;
  valor: number;
  descricao: string;
};

export type TituloSistema = {
  id: string;
  valor: number;
  vencimento: string;
  nome: string; // Cliente ou Fornecedor
  tipo: 'pagar' | 'receber';
};

export type MatchedTransaction = {
  ofx: OfxTransaction;
  match?: TituloSistema;
  score: number; // 0 a 100
};

export const ofxService = {
  /**
   * Parses an OFX string into an array of transactions using ofx-js.
   */
  async parse(content: string): Promise<OfxTransaction[]> {
    try {
      const data = await parseOfx(content);

      // Navigate to the transactions list
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
    const year = raw.substring(0, 4);
    const month = raw.substring(4, 6);
    const day = raw.substring(6, 8);
    return `${year}-${month}-${day}`;
  },

  /**
   * Calcula a similaridade entre duas strings usando um método simplificado
   * Retorna um score de 0 a 1
   */
  calculateTextSimilarity(s1: string, s2: string): number {
    if (!s1 || !s2) return 0;
    const str1 = s1.toLowerCase().trim();
    const str2 = s2.toLowerCase().trim();
    
    if (str1 === str2) return 1;
    if (str1.includes(str2) || str2.includes(str1)) return 0.8;

    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    let matches = 0;

    for (const w1 of words1) {
      if (w1.length < 3) continue;
      for (const w2 of words2) {
        if (w1 === w2) matches++;
      }
    }
    
    const minWords = Math.min(words1.length, words2.length);
    if (minWords === 0) return 0;
    
    return Math.min(matches / minWords, 1);
  },

  /**
   * Engine Heurística para correlacionar Transações do OFX com Títulos do ERP
   */
  correlateTransactions(
    ofxTransactions: OfxTransaction[],
    titulos: TituloSistema[]
  ): MatchedTransaction[] {
    return ofxTransactions.map((ofx) => {
      let bestMatch: TituloSistema | undefined = undefined;
      let highestScore = 0;

      for (const titulo of titulos) {
        let currentScore = 0;

        // 1. Regra de Valor (Máx 50 pts)
        // OFX: Despesas são negativas. Receitas são positivas.
        const ofxAbs = Math.abs(ofx.valor);
        const isOfxDespesa = ofx.valor < 0;
        
        // Match exato de direção e valor?
        if ((isOfxDespesa && titulo.tipo === 'pagar') || (!isOfxDespesa && titulo.tipo === 'receber')) {
          if (ofxAbs === titulo.valor) {
            currentScore += 50;
          } else {
            // Tolerância de até 2% (Ex: Juros ou desconto)
            const diffPerc = Math.abs(ofxAbs - titulo.valor) / titulo.valor;
            if (diffPerc <= 0.02) {
              currentScore += 25;
            }
          }
        }

        // Se errou feio no valor ou na direção (pagar/receber invertido), ignorar
        if (currentScore === 0) continue;

        // 2. Regra de Data (Máx 30 pts)
        const dateOfx = new Date(ofx.data).getTime();
        const dateTitulo = new Date(titulo.vencimento).getTime();
        const diffDays = Math.abs((dateOfx - dateTitulo) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          currentScore += 30;
        } else if (diffDays <= 5) {
          // Perde 5 pontos a cada dia distante
          currentScore += Math.max(30 - (diffDays * 5), 0);
        }

        // 3. Regra de Texto (Máx 20 pts)
        const similarity = this.calculateTextSimilarity(ofx.descricao, titulo.nome);
        if (similarity === 1) {
          currentScore += 20;
        } else if (similarity >= 0.75) {
          currentScore += 15;
        } else if (similarity >= 0.3) {
          currentScore += 10;
        }

        if (currentScore > highestScore) {
          highestScore = currentScore;
          bestMatch = titulo;
        }
      }

      return {
        ofx,
        match: highestScore >= 50 ? bestMatch : undefined,
        score: highestScore
      };
    });
  }
};
