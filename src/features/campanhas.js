// @ts-check
/**
 * campanhas.js — barrel de re-exportação.
 *
 * Todo o código real está em campanhas/:
 *   • data.js    — estado, helpers puros, loaders de dados
 *   • render.js  — funções de renderização de UI
 *   • actions.js — mutações, CRUD, fila WhatsApp
 *
 * main.js importa daqui sem precisar conhecer a estrutura interna.
 */

// ── Data / loaders ────────────────────────────────────────────────────────────
export {
  carregarCampanhas,
  carregarCampanhaEnvios,
  adotarCampanhasParaFilialAtiva
} from './campanhas/data.js';

// ── Render ────────────────────────────────────────────────────────────────────
export {
  renderCampanhasMet,
  renderCampanhas,
  renderCampanhaPreview,
  renderFilaWhatsApp,
  renderCampanhaEnvios,
  abrirCampanhaDet
} from './campanhas/render.js';

// ── Actions ───────────────────────────────────────────────────────────────────
export {
  refreshCampanhasTela,
  limparFormCampanha,
  abrirNovaCampanha,
  editarCampanha,
  salvarCampanha,
  removerCampanha,
  gerarFilaCampanha,
  desfazerStatusEnvio,
  marcarEnvioEnviado,
  marcarEnvioFalhou,
  marcarSelecionadosEnviados,
  marcarSelecionadosFalhou,
  toggleEnvioFilaSelecionado,
  toggleSelecionarTodosFilaWhatsApp,
  abrirPreviewWhatsAppEnvio,
  abrirWhatsAppPreviewAtual,
  abrirWhatsAppEnvio,
  copiarNumeroPreviewAtual,
  copiarMensagemPreviewAtual,
  abrirWhatsAppLote,
  proximoEnvioLoteWhatsApp
} from './campanhas/actions.js';
