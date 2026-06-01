import { db, type OfflinePedido, type NfceContingencia } from './db';
import { buildNfceXml } from './nfceBuilder';
import { signNfceXml } from './nfceSigner';
import { getSupabaseConfig } from '../../../app/supabaseConfig';

// Mock function representing online transmission
async function transmitToSefaz(xmlString: string, token: string): Promise<any> {
  const { url, key } = getSupabaseConfig();
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

  try {
    const res = await fetch(`${url}/functions/v1/sefaz-transmit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Authorization': `Bearer ${token}`,
        'apikey': key
      },
      body: xmlString,
      signal: controller.signal
    });

    clearTimeout(id);

    if (!res.ok) {
      throw new Error(`Erro HTTP: ${res.status}`);
    }

    return await res.json();
  } catch (error: any) {
    clearTimeout(id);
    throw new Error('Falha de comunicação SEFAZ: ' + error.message);
  }
}

// Generate the Offline NFC-e QR Code URL
export function generateContingencyQRCode(chaveAcesso: string): string {
  // Exemplo de URL de consulta estadual (SP)
  // O padrão do MOC inclui a chave, versão, ambiente, e hash do CSC.
  // Para contingência offline (tpEmis=9), o QR Code é impresso com dados básicos.
  const baseUrl = 'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx';
  return `${baseUrl}?p=${chaveAcesso}|2|2|1|`; // Simplificado para fins de demonstração
}

export async function processNfce(
  pedido: OfflinePedido,
  token: string,
  forceContingency: boolean = false
): Promise<{ success: boolean; isContingency: boolean; message: string; qrCodeUrl?: string }> {
  try {
    const numNfce = Math.floor(Math.random() * 999999).toString();
    const { xmlString, chaveAcesso, uriId } = await buildNfceXml(pedido, numNfce);
    
    let signedXml: string;
    try {
      signedXml = await signNfceXml(xmlString, uriId);
    } catch (e: any) {
      return {
        success: false,
        isContingency: false,
        message: 'Erro na assinatura digital: ' + e.message
      };
    }

    let isOnline = typeof navigator !== 'undefined' && navigator.onLine;

    // Try online transmission if not forced to contingency and device is online
    if (isOnline && !forceContingency) {
      try {
        await transmitToSefaz(signedXml, token);
        return {
          success: true,
          isContingency: false,
          message: 'NFC-e Autorizada com sucesso.'
        };
      } catch (err) {
        // Communication failed (timeout > 15s or network error) -> Fallback to Contingency
        console.warn('Falha na SEFAZ. Entrando em modo contingência...', err);
      }
    }

    // --- CONTINGENCY MODE (tpEmis = 9) ---
    const qrCodeUrl = generateContingencyQRCode(chaveAcesso);

    const contingenciaRecord: NfceContingencia = {
      id: crypto.randomUUID(),
      pedido_id: pedido.id,
      filial_id: pedido.filial_id,
      chave_acesso: chaveAcesso,
      xml_assinado: signedXml,
      qrcode_url: qrCodeUrl,
      status: 'pendente',
      criado_em: new Date().toISOString()
    };

    await db.nfce_contingencia.put(contingenciaRecord);

    return {
      success: true,
      isContingency: true,
      message: 'NFC-e emitida em Contingência Offline.',
      qrCodeUrl
    };

  } catch (error: any) {
    return {
      success: false,
      isContingency: false,
      message: 'Erro ao processar NFC-e: ' + error.message
    };
  }
}
