import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type RdoWhatsAppParams = {
  clienteNome?: string;
  clienteTelefone?: string;
  obraTitulo: string;
  obraId: string;
  rdoTitulo: string;
  rdoRelatorio: string;
  clima?: 'ensolarado' | 'chuvoso' | 'nublado' | string;
  maoDeObraQtd?: number;
  progressoTotal?: number;
  dataRegistro?: string;
};

export function buildRdoWhatsAppMessage(params: RdoWhatsAppParams): string {
  const dateFormatted = params.dataRegistro
    ? format(new Date(params.dataRegistro), "dd/MM/yyyy", { locale: ptBR })
    : format(new Date(), 'dd/MM/yyyy');

  const climaEmoji =
    params.clima === 'ensolarado'
      ? '☀️ Ensolarado'
      : params.clima === 'chuvoso'
      ? '🌧️ Chuvoso'
      : '⛅ Nublado';

  const portalUrl = `${window.location.origin}/portal/obra/${params.obraId}`;

  return `🏗️ *Boletim da Obra — ${params.obraTitulo}*
📅 *${dateFormatted}*

Olá, *${params.clienteNome || 'Cliente'}*! 👋

*${params.rdoTitulo}*
${params.rdoRelatorio}

📊 *Progresso Geral*: ${params.progressoTotal ?? 0}% concluído
👷 *Equipe no local*: ${params.maoDeObraQtd ?? 1} profissional(is)
${climaEmoji}

📸 *Clique no link abaixo para ver as fotos HD de hoje e o cronograma completo*:
${portalUrl}

_Qualquer dúvida, estamos à disposição!_`;
}

export function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `55${cleaned}`;
  }
  return cleaned;
}
