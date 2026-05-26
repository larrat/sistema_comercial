import { getSupabaseConfig } from '../../../app/supabaseConfig';

export type FiscalResult = {
  ok: boolean;
  nfe_id?: string;
  nfe_url?: string;
  error?: string;
};

export const fiscalService = {
  /**
   * Simulates/Emits NFe.
   * Performs real pre-SEFAZ compliance validation on database fields.
   */
  async emitirNFe(token: string, pedidoId: string): Promise<FiscalResult> {
    const { url, key } = getSupabaseConfig();
    const headers = {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      // 1. Fetch order data
      let pedido: any;
      if (pedidoId === 'PENDING') {
        // Fetch first pending order to process via Dashboard Pilot
        const resPending = await fetch(`${url}/rest/v1/pedidos?fiscal_status=eq.pendente&limit=1`, {
          headers
        });
        const pendingList = await resPending.json();
        if (resPending.ok && pendingList.length > 0) {
          pedido = pendingList[0];
        } else {
          // Fallback to any order just to allow demonstration
          const resAll = await fetch(`${url}/rest/v1/pedidos?limit=1`, { headers });
          const allList = await resAll.json();
          if (resAll.ok && allList.length > 0) {
            pedido = allList[0];
          } else {
            throw new Error('Nenhum pedido pendente ou cadastrado no sistema');
          }
        }
      } else {
        const resCheck = await fetch(`${url}/rest/v1/pedidos?id=eq.${pedidoId}`, {
          headers
        });
        const pedidos = await resCheck.json();
        if (!resCheck.ok || !pedidos.length) throw new Error('Pedido não encontrado');
        pedido = pedidos[0];
      }

      // 2. Fetch Client details
      let cliente: any = null;
      if (pedido.cliente_id) {
        const resCli = await fetch(`${url}/rest/v1/clientes?id=eq.${pedido.cliente_id}`, { headers });
        const clis = await resCli.json();
        if (resCli.ok && clis.length > 0) {
          cliente = clis[0];
        }
      }

      // 3. Fetch Filial details
      let filial: any = null;
      if (pedido.filial_id) {
        const resFil = await fetch(`${url}/rest/v1/filiais?id=eq.${pedido.filial_id}`, { headers });
        const fils = await resFil.json();
        if (resFil.ok && fils.length > 0) {
          filial = fils[0];
        }
      }

      // 4. PRE-SEFAZ RIGID COMPLIANCE ENGINE
      // A. Branch Validations
      if (!filial) {
        throw new Error('Rejeição SEFAZ (Cód. 220): Filial emitente não identificada para este pedido');
      }
      if (!filial.cnpj || filial.cnpj.replace(/\D/g, '').length !== 14) {
        throw new Error(`Rejeição SEFAZ (Cód. 203): CNPJ do emitente (${filial.nome}) inválido ou não cadastrado no banco`);
      }
      if (!filial.inscricao_estadual || filial.inscricao_estadual.trim() === '') {
        throw new Error(`Rejeição SEFAZ (Cód. 204): Inscrição Estadual do emitente (${filial.nome}) não cadastrada`);
      }
      if (!filial.cep || !filial.logradouro || !filial.numero || !filial.bairro) {
        throw new Error(`Rejeição SEFAZ (Cód. 205): Endereço fiscal da filial emitente (${filial.nome}) incompleto`);
      }

      // B. Client Validations
      if (!cliente) {
        throw new Error('Rejeição SEFAZ (Cód. 221): Cliente destinatário não identificado para este pedido');
      }
      if (!cliente.doc || cliente.doc.replace(/\D/g, '').length < 11) {
        throw new Error(`Rejeição SEFAZ (Cód. 207): CPF/CNPJ do destinatário (${cliente.nome}) inválido ou obrigatório para emissão`);
      }
      if (!cliente.cep || !cliente.logradouro || !cliente.numero || !cliente.bairro) {
        throw new Error(`Rejeição SEFAZ (Cód. 208): Endereço de faturamento do destinatário (${cliente.nome}) incompleto`);
      }

      // C. Items & Product Validations
      const itens = typeof pedido.itens === 'string' ? JSON.parse(pedido.itens) : pedido.itens;
      if (!itens || !Array.isArray(itens) || itens.length === 0) {
        throw new Error('Rejeição SEFAZ (Cód. 228): Pedido não contém itens de venda válidos');
      }

      for (const item of itens) {
        const resProd = await fetch(`${url}/rest/v1/produtos?id=eq.${item.prodId}`, { headers });
        const prods = await resProd.json();
        if (resProd.ok && prods.length > 0) {
          const prod = prods[0];
          if (!prod.ncm || prod.ncm.replace(/\D/g, '').length !== 8) {
            throw new Error(`Rejeição SEFAZ (Cód. 325): Código NCM (${prod.ncm || 'vazio'}) do produto '${prod.nome}' deve ter exatamente 8 dígitos`);
          }
          if (!prod.cfop_padrao || prod.cfop_padrao.replace(/\D/g, '').length !== 4) {
            throw new Error(`Rejeição SEFAZ (Cód. 326): Código CFOP (${prod.cfop_padrao || 'vazio'}) inválido no produto '${prod.nome}'`);
          }
        }
      }

      // 5. Simulate API Call delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 6. Generate 44-digit mathematically valid SEFAZ Access Key (Chave de Acesso)
      // Format: UF(2) + AAMM(4) + CNPJ(14) + Modelo(2) + Série(3) + Número(9) + TipoEmissão(1) + CódigoNumérico(8) + DV(1)
      const uf = '35'; // São Paulo
      const now = new Date();
      const aamm = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      const cleanCnpj = filial.cnpj.replace(/\D/g, '').padStart(14, '0');
      const modelo = '55'; // NF-e
      const serie = '001';
      const numero = String(pedido.num || Math.floor(Math.random() * 900000 + 100000)).padStart(9, '0');
      const tipoEmissao = '1'; // Normal
      const codNumerico = Math.floor(10000000 + Math.random() * 90000000).toString();
      
      const keyWithoutDv = `${uf}${aamm}${cleanCnpj}${modelo}${serie}${numero}${tipoEmissao}${codNumerico}`;
      
      // Calculate Modulo 11 check digit (DV)
      let sum = 0;
      let weight = 2;
      for (let i = keyWithoutDv.length - 1; i >= 0; i--) {
        sum += parseInt(keyWithoutDv[i], 10) * weight;
        weight = weight === 9 ? 2 : weight + 1;
      }
      const rest = sum % 11;
      const dv = rest < 2 ? '0' : String(11 - rest);
      const accessKey = `${keyWithoutDv}${dv}`;

      const mockNfeUrl = `https://www.nfe.fazenda.gov.br/portal/consultaRecipiente.aspx?chaveDeAcesso=${accessKey}`;

      // 7. Update Order with mock NFe data
      const resUpdate = await fetch(`${url}/rest/v1/pedidos?id=eq.${pedido.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          fiscal_status: 'emitido',
          nfe_id: accessKey,
          nfe_url: mockNfeUrl
        })
      });

      if (!resUpdate.ok) throw new Error('Falha ao atualizar status fiscal do pedido no banco de dados');

      return {
        ok: true,
        nfe_id: accessKey,
        nfe_url: mockNfeUrl
      };
    } catch (err) {
      console.error('Fiscal Error:', err);

      // If we found the specific order, flag the error state in it
      if (pedidoId !== 'PENDING') {
        await fetch(`${url}/rest/v1/pedidos?id=eq.${pedidoId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ fiscal_status: 'erro' })
        }).catch((err) => console.error('Erro ao atualizar status fiscal:', err));
      }

      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido na emissão'
      };
    }
  }
};
