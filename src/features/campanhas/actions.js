// @ts-check
/**
 * campanhas/actions.js — mutações, CRUD, fila WhatsApp e ações do usuário.
 *
 * Importa de data.js (estado) e render.js (re-render após mutações).
 * Nenhum outro módulo campanhas/ importa deste arquivo.
 */

import { SB } from '../../app/api.js';
import { D, State, C } from '../../app/store.js';
import {
  abrirModal,
  fecharModal,
  toast,
  uid,
  setButtonLoading,
  notify,
  focusField
} from '../../shared/utils.js';
import { MSG, SEVERITY } from '../../shared/messages.js';

import {
  campUiState,
  getCampanhasCache,
  getEnviosCache,
  getEnvioById,
  getFilaWhatsApp,
  getPrimeiroEnvioWhatsAppPendenteCampanha,
  buildWhatsAppUrl,
  labelStatusEnvio,
  carregarCampanhas,
  carregarCampanhaEnvios
} from './data.js';

import {
  renderCampDiag,
  renderCampanhasMet,
  renderCampanhas,
  renderFilaWhatsApp,
  renderCampanhaEnvios,
  renderCampanhaPreview,
  renderPreviewWhatsAppAtual
} from './render.js';

/** @typedef {import('../../types/domain').CampanhaEnvio} CampanhaEnvio */
/** @typedef {import('../../types/domain').CampanhaFilaResult} CampanhaFilaResult */

// ── Helpers internos ──────────────────────────────────────────────────────────

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

function getInputValue(id) {
  return document.getElementById(id)?.value ?? '';
}

function setBotaoGerarFilaLoading(campanhaId, loading) {
  const btn = document.getElementById(`camp-run-${campanhaId}`);
  if (!btn) return;
  setButtonLoading(btn, loading, 'GER');
}

function limparSelecaoFilaInexistente(envios) {
  const idsAtuais = new Set((envios || []).map((e) => e.id));
  campUiState.waSelecionados.forEach((id) => {
    if (!idsAtuais.has(id)) campUiState.waSelecionados.delete(id);
  });
}

function getFilaWhatsAppSelecionados() {
  const envios = getFilaWhatsApp().filter((e) => campUiState.waSelecionados.has(e.id));
  limparSelecaoFilaInexistente(getFilaWhatsApp());
  return envios;
}

function syncLoteGuiadoAtual() {
  if (!campUiState.waLoteIds.length) return;
  campUiState.waLoteIds = campUiState.waLoteIds.filter((id) => !!getEnvioById(id));
  if (!campUiState.waLoteIds.length) {
    campUiState.waLoteIndex = -1;
    campUiState.waPreviewAtualId = null;
    return;
  }
  if (campUiState.waLoteIndex < 0) campUiState.waLoteIndex = 0;
  if (campUiState.waLoteIndex >= campUiState.waLoteIds.length)
    campUiState.waLoteIndex = campUiState.waLoteIds.length - 1;
  campUiState.waPreviewAtualId = campUiState.waLoteIds[campUiState.waLoteIndex] || null;
}

function limparLoteGuiado() {
  campUiState.waLoteIds = [];
  campUiState.waLoteIndex = -1;
}

function abrirJanelaPreparacaoWhatsApp() {
  const win = window.open('', '_blank');
  if (!win) return null;
  try {
    win.document.write(`
      <title>Preparando WhatsApp</title>
      <body style="font-family:Arial,sans-serif;padding:24px;line-height:1.5">
        <h2>Preparando conversa no WhatsApp...</h2>
        <p>Aguarde enquanto geramos a fila e montamos a mensagem.</p>
      </body>
    `);
    win.document.close();
  } catch {
    // navegador pode restringir write
  }
  return win;
}

/**
 * @param {Window | null} win
 * @param {CampanhaEnvio | null} envio
 * @returns {boolean}
 */
function redirecionarJanelaWhatsApp(win, envio) {
  if (!envio?.destino) return false;
  const url = buildWhatsAppUrl(envio.destino, envio.mensagem);
  if (win && !win.closed) {
    win.location.href = url;
    win.focus?.();
    return true;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

async function copyToClipboard(text, successMessage) {
  const value = String(text || '');
  if (!value.trim()) {
    notify('Nenhum conteúdo disponível para copiar.', SEVERITY.INFO);
    return false;
  }
  try {
    await navigator.clipboard.writeText(value);
    notify(successMessage, SEVERITY.SUCCESS);
    return true;
  } catch {
    notify('Falha ao copiar para a área de transferência.', SEVERITY.ERROR);
    return false;
  }
}

async function persistirStatusEnvio(payload) {
  const prevEnvios = getEnviosCache().slice();
  const idx = prevEnvios.findIndex((e) => e.id === payload.id);
  D.campanhaEnvios[State.FIL] =
    idx >= 0
      ? prevEnvios.map((envio, i) => (i === idx ? payload : envio))
      : [payload, ...prevEnvios];
  campUiState.statusFeedback = {
    envioId: payload.id,
    status: payload.status,
    at: Date.now()
  };
  renderCampanhasMet();
  renderFilaWhatsApp();
  renderCampanhaEnvios();

  const updateResult = await SB.toResult(() => SB.updateCampanhaEnvio(payload));
  if (!updateResult.ok) {
    D.campanhaEnvios[State.FIL] = prevEnvios;
    renderCampanhasMet();
    renderFilaWhatsApp();
    renderCampanhaEnvios();
    notify(MSG.campanhas.envioUpdateFailed(updateResult.error?.message), SEVERITY.ERROR);
    return false;
  }
  return true;
}

// ── Carregamento + refresh ────────────────────────────────────────────────────

export async function refreshCampanhasTela() {
  await Promise.all([carregarCampanhas(), carregarCampanhaEnvios()]);
  renderCampDiag();
  renderCampanhasMet();
  renderCampanhas();
  renderFilaWhatsApp();
  renderCampanhaEnvios();
}

// ── Formulário ────────────────────────────────────────────────────────────────

export function limparFormCampanha() {
  State.editIds = State.editIds || {};
  State.editIds.campanha = null;

  const titulo = document.getElementById('campanha-modal-titulo');
  if (titulo) titulo.textContent = 'Nova campanha';

  setInputValue('camp-nome', '');
  setInputValue('camp-tipo', 'aniversario');
  setInputValue('camp-canal', 'whatsapp_manual');
  setInputValue('camp-dias', 0);
  setInputValue('camp-assunto', '');
  setInputValue(
    'camp-mensagem',
    'Olá, {{nome}}!\n\nPreparamos uma condição especial para você:\n{{desconto}} de desconto com o cupom {{cupom}}.\n\nVálido até {{validade}}.'
  );
  setInputValue('camp-cupom', '');
  setInputValue('camp-desconto', 0);

  const ativo = document.getElementById('camp-ativo');
  if (ativo) ativo.checked = true;
  renderCampanhaPreview();
}

export function abrirNovaCampanha() {
  limparFormCampanha();
  abrirModal('modal-campanha');
}

export function editarCampanha(id) {
  const campanha = getCampanhasCache().find((c) => c.id === id);
  if (!campanha) return;

  State.editIds = State.editIds || {};
  State.editIds.campanha = id;

  const titulo = document.getElementById('campanha-modal-titulo');
  if (titulo) titulo.textContent = 'Editar campanha';

  setInputValue('camp-nome', campanha.nome);
  setInputValue('camp-tipo', campanha.tipo || 'aniversario');
  setInputValue('camp-canal', campanha.canal || 'whatsapp_manual');
  setInputValue('camp-dias', campanha.dias_antecedencia ?? 0);
  setInputValue('camp-assunto', campanha.assunto || '');
  setInputValue('camp-mensagem', campanha.mensagem || '');
  setInputValue('camp-cupom', campanha.cupom || '');
  setInputValue('camp-desconto', campanha.desconto ?? 0);

  const ativo = document.getElementById('camp-ativo');
  if (ativo) ativo.checked = !!campanha.ativo;

  renderCampanhaPreview();
  abrirModal('modal-campanha');
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function salvarCampanha() {
  setButtonLoading(
    'camp-save-btn',
    true,
    State.editIds?.campanha ? 'Atualizar campanha' : 'Salvar campanha'
  );
  const nome = getInputValue('camp-nome').trim();
  const tipo = getInputValue('camp-tipo') || 'aniversario';
  const canal = getInputValue('camp-canal') || 'whatsapp_manual';
  const dias_antecedencia = Number(getInputValue('camp-dias') || 0);
  const assunto = getInputValue('camp-assunto').trim();
  const mensagem = getInputValue('camp-mensagem').trim();
  const cupom = getInputValue('camp-cupom').trim();
  const desconto = Number(getInputValue('camp-desconto') || 0);
  const ativo = !!document.getElementById('camp-ativo')?.checked;

  if (!nome) {
    setButtonLoading(
      'camp-save-btn',
      false,
      State.editIds?.campanha ? 'Atualizar campanha' : 'Salvar campanha'
    );
    notify(MSG.forms.required('Nome da campanha'), SEVERITY.WARNING);
    focusField('camp-nome', { markError: true });
    return;
  }
  if (!mensagem) {
    setButtonLoading(
      'camp-save-btn',
      false,
      State.editIds?.campanha ? 'Atualizar campanha' : 'Salvar campanha'
    );
    notify(MSG.forms.required('Mensagem da campanha'), SEVERITY.WARNING);
    focusField('camp-mensagem', { markError: true });
    return;
  }

  const item = {
    id: State.editIds?.campanha || uid(),
    filial_id: State.FIL,
    nome,
    tipo,
    canal,
    dias_antecedencia,
    assunto: assunto || null,
    mensagem,
    cupom: cupom || null,
    desconto,
    ativo
  };

  const saveResult = await SB.toResult(() => SB.upsertCampanha(item));
  if (!saveResult.ok) {
    setButtonLoading(
      'camp-save-btn',
      false,
      State.editIds?.campanha ? 'Atualizar campanha' : 'Salvar campanha'
    );
    console.error('Erro ao salvar campanha no banco', saveResult.error);
    notify(MSG.campanhas.saveFailed(saveResult.error?.message), SEVERITY.ERROR);
    return;
  }

  const list = getCampanhasCache();
  const idx = list.findIndex((c) => c.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);

  fecharModal('modal-campanha');
  renderCampanhasMet();
  renderCampanhas();
  notify(
    State.editIds?.campanha
      ? 'Sucesso: campanha atualizada e pronta para uso.'
      : 'Sucesso: campanha criada e pronta para uso.',
    SEVERITY.SUCCESS
  );
  setButtonLoading(
    'camp-save-btn',
    false,
    State.editIds?.campanha ? 'Atualizar campanha' : 'Salvar campanha'
  );
}

export async function removerCampanha(id) {
  if (!confirm('Remover campanha?')) return;

  const deleteResult = await SB.toResult(() => SB.deleteCampanha(id));
  if (!deleteResult.ok) {
    console.error('Erro ao remover campanha no banco', deleteResult.error);
    notify('Erro: não foi possível remover no banco. Ação: tente novamente.', SEVERITY.ERROR);
    return;
  }

  D.campanhas[State.FIL] = getCampanhasCache().filter((c) => c.id !== id);
  renderCampanhasMet();
  renderCampanhas();
  toast('Campanha removida.');
}

// ── Geração de fila ───────────────────────────────────────────────────────────

export async function gerarFilaCampanha(campanhaId) {
  const campanha = getCampanhasCache().find((c) => c.id === campanhaId);
  if (!campanha) {
    notify(MSG.campanhas.notFound, SEVERITY.ERROR);
    return;
  }

  const prepararWhatsApp = campanha.canal === 'whatsapp_manual';
  const janelaWhatsApp = prepararWhatsApp ? abrirJanelaPreparacaoWhatsApp() : null;

  setBotaoGerarFilaLoading(campanhaId, true);

  if (!campanha.ativo) {
    setBotaoGerarFilaLoading(campanhaId, false);
    if (janelaWhatsApp && !janelaWhatsApp.closed) janelaWhatsApp.close();
    notify(MSG.campanhas.inactive, SEVERITY.WARNING);
    return;
  }

  const queueResult = await SB.toResult(() => SB.gerarFilaCampanhaEdge(campanhaId, false));
  if (!queueResult.ok) {
    setBotaoGerarFilaLoading(campanhaId, false);
    if (janelaWhatsApp && !janelaWhatsApp.closed) janelaWhatsApp.close();
    notify(MSG.campanhas.queueFetchFailed(queueResult.error?.message), SEVERITY.ERROR);
    return;
  }

  /** @type {CampanhaFilaResult} */
  const resumo = queueResult.data || {
    campanha_id: campanhaId,
    filial_id: State.FIL,
    dry_run: false,
    criados: 0,
    ignorados: 0,
    falhas: 0,
    total_elegiveis: 0
  };

  await carregarCampanhaEnvios();
  renderCampanhasMet();
  renderCampanhas();
  renderFilaWhatsApp();
  renderCampanhaEnvios();
  setBotaoGerarFilaLoading(campanhaId, false);

  if (!Number(resumo.total_elegiveis || 0) && !Number(resumo.criados || 0)) {
    if (janelaWhatsApp && !janelaWhatsApp.closed) janelaWhatsApp.close();
    notify(MSG.campanhas.noEligible(), SEVERITY.INFO);
    return;
  }

  if (prepararWhatsApp) {
    const primeiroEnvio = getPrimeiroEnvioWhatsAppPendenteCampanha(campanhaId);
    const abriuConversa = redirecionarJanelaWhatsApp(janelaWhatsApp, primeiroEnvio);
    if (!abriuConversa) {
      if (janelaWhatsApp && !janelaWhatsApp.closed) janelaWhatsApp.close();
      notify(
        'Fila gerada, mas nenhum envio com número válido ficou disponível para abrir no WhatsApp.',
        SEVERITY.WARNING
      );
    }
  }

  notify(
    MSG.campanhas.queueResult({
      criados: Number(resumo.criados || 0),
      ignorados: Number(resumo.ignorados || 0),
      falhas: Number(resumo.falhas || 0)
    }),
    Number(resumo.falhas || 0) > 0 ? SEVERITY.WARNING : SEVERITY.SUCCESS
  );
}

// ── Envio — status mutations ──────────────────────────────────────────────────

export async function desfazerStatusEnvio(envioId) {
  const envio = getEnvioById(String(envioId || '').trim());
  if (!envio) return;

  if (
    !confirm(
      `Desfazer o status de ${labelStatusEnvio(envio.status).toLowerCase()} e devolver este envio para a fila manual?`
    )
  )
    return;

  const payload = {
    ...envio,
    status: 'manual',
    enviado_em: null,
    erro: null
  };

  const ok = await persistirStatusEnvio(payload);
  if (!ok) return;
  notify('Sucesso: envio devolvido para a fila manual.', SEVERITY.SUCCESS);
}

export async function marcarEnvioEnviado(envioId) {
  const envio = getEnviosCache().find((e) => e.id === envioId);
  if (!envio) return;

  const cliente = (C() || []).find((c) => c.id === envio.cliente_id);
  if (!confirm(`Confirmar envio para ${cliente?.nome || 'este cliente'}?`)) return;

  const payload = {
    ...envio,
    status: 'enviado',
    enviado_em: new Date().toISOString(),
    erro: null
  };

  const ok = await persistirStatusEnvio(payload);
  if (!ok) return;
  notify('Sucesso: envio marcado como enviado.', SEVERITY.SUCCESS);
}

export async function marcarEnvioFalhou(envioId) {
  const envio = getEnviosCache().find((e) => e.id === envioId);
  if (!envio) return;

  const cliente = (C() || []).find((c) => c.id === envio.cliente_id);
  if (!confirm(`Confirmar falha de envio para ${cliente?.nome || 'este cliente'}?`)) return;

  const motivo = prompt('Informe o motivo da falha:', envio.erro || '') || null;

  const payload = {
    ...envio,
    status: 'falhou',
    erro: motivo,
    enviado_em: null
  };

  const ok = await persistirStatusEnvio(payload);
  if (!ok) return;
  notify(
    'Atenção: envio marcado como falho. Impacto: cliente não recebeu a mensagem. Ação: revise o motivo e tente novo envio.',
    SEVERITY.WARNING
  );
}

export async function marcarSelecionadosEnviados() {
  const selecionados = getFilaWhatsAppSelecionados();
  if (!selecionados.length) {
    notify('Selecione pelo menos um envio da fila para marcar como enviado.', SEVERITY.INFO);
    return;
  }

  if (
    !confirm(
      `Confirmar ${selecionados.length} envio${selecionados.length !== 1 ? 's' : ''} como enviado${selecionados.length !== 1 ? 's' : ''}?`
    )
  )
    return;

  for (const envio of selecionados) {
    const payload = {
      ...envio,
      status: 'enviado',
      enviado_em: new Date().toISOString(),
      erro: null
    };
    const ok = await persistirStatusEnvio(payload);
    if (!ok) continue;
  }

  campUiState.waSelecionados.clear();
  renderFilaWhatsApp();
}

export async function marcarSelecionadosFalhou() {
  const selecionados = getFilaWhatsAppSelecionados();
  if (!selecionados.length) {
    notify('Selecione pelo menos um envio da fila para marcar como falhou.', SEVERITY.INFO);
    return;
  }

  if (
    !confirm(
      `Confirmar ${selecionados.length} envio${selecionados.length !== 1 ? 's' : ''} como falho${selecionados.length !== 1 ? 's' : ''}?`
    )
  )
    return;

  const motivo = prompt('Informe o motivo da falha para os envios selecionados:', '') || null;

  for (const envio of selecionados) {
    const payload = {
      ...envio,
      status: 'falhou',
      erro: motivo,
      enviado_em: null
    };
    const ok = await persistirStatusEnvio(payload);
    if (!ok) continue;
  }

  campUiState.waSelecionados.clear();
  renderCampanhaEnvios();
  notify('Atenção: envios selecionados marcados como falhos.', SEVERITY.WARNING);
}

// ── WhatsApp preview e lote ───────────────────────────────────────────────────

export function abrirPreviewWhatsAppEnvio(envioId) {
  const envio = getEnvioById(String(envioId || '').trim());
  if (!envio) {
    notify('Erro: envio não encontrado para pré-visualização.', SEVERITY.ERROR);
    return;
  }
  if (!envio.destino) {
    notify(MSG.campanhas.missingDestino, SEVERITY.WARNING);
    return;
  }

  limparLoteGuiado();
  campUiState.waPreviewAtualId = envio.id;
  renderPreviewWhatsAppAtual();
  abrirModal('modal-campanha-wa-preview');
}

export function abrirWhatsAppPreviewAtual() {
  const envio = getEnvioById(campUiState.waPreviewAtualId);
  if (!envio) {
    notify('Erro: preview expirou ou o envio não está mais disponível.', SEVERITY.ERROR);
    return;
  }
  abrirWhatsAppEnvio(envio.id);
}

export async function abrirWhatsAppEnvio(envioId) {
  const envio = getEnviosCache().find((e) => e.id === envioId);
  if (!envio) {
    notify(
      'Erro: envio não encontrado. Impacto: não foi possível abrir a conversa. Ação: atualize a fila e tente novamente.',
      SEVERITY.ERROR
    );
    return;
  }
  if (!envio.destino) {
    notify(MSG.campanhas.missingDestino, SEVERITY.WARNING);
    return;
  }
  const url = buildWhatsAppUrl(envio.destino, envio.mensagem);
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function copiarNumeroPreviewAtual() {
  const envio = getEnvioById(campUiState.waPreviewAtualId);
  if (!envio) {
    notify('Erro: preview expirou ou o envio não está mais disponível.', SEVERITY.ERROR);
    return;
  }
  await copyToClipboard(envio.destino, 'Número copiado com sucesso.');
}

export async function copiarMensagemPreviewAtual() {
  const envio = getEnvioById(campUiState.waPreviewAtualId);
  if (!envio) {
    notify('Erro: preview expirou ou o envio não está mais disponível.', SEVERITY.ERROR);
    return;
  }
  await copyToClipboard(envio.mensagem, 'Mensagem copiada com sucesso.');
}

export function toggleEnvioFilaSelecionado(envioId) {
  if (campUiState.waSelecionados.has(envioId)) campUiState.waSelecionados.delete(envioId);
  else campUiState.waSelecionados.add(envioId);
  renderFilaWhatsApp();
}

export function toggleSelecionarTodosFilaWhatsApp() {
  const elegiveis = getFilaWhatsApp().filter(
    (e) => e.status === 'manual' || e.status === 'pendente'
  );
  const todosSelecionados =
    elegiveis.length > 0 && elegiveis.every((e) => campUiState.waSelecionados.has(e.id));

  if (todosSelecionados) elegiveis.forEach((e) => campUiState.waSelecionados.delete(e.id));
  else elegiveis.forEach((e) => campUiState.waSelecionados.add(e.id));

  renderFilaWhatsApp();
}

export function abrirWhatsAppLote() {
  const selecionados = getFilaWhatsAppSelecionados();
  if (!selecionados.length) {
    notify('Selecione pelo menos um envio da fila para iniciar o lote guiado.', SEVERITY.INFO);
    return;
  }

  campUiState.waLoteIds = selecionados
    .filter((envio) => !!String(envio.destino || '').trim())
    .map((envio) => envio.id);
  campUiState.waLoteIndex = 0;
  syncLoteGuiadoAtual();

  if (!campUiState.waPreviewAtualId) {
    notify('Nenhum envio selecionado possui número válido para abrir o lote.', SEVERITY.WARNING);
    limparLoteGuiado();
    return;
  }

  renderPreviewWhatsAppAtual();
  abrirModal('modal-campanha-wa-preview');
  notify(`Lote guiado iniciado com ${campUiState.waLoteIds.length} envio(s).`, SEVERITY.SUCCESS);
}

export function proximoEnvioLoteWhatsApp() {
  if (!campUiState.waLoteIds.length) {
    notify('Nenhum lote guiado ativo neste momento.', SEVERITY.INFO);
    return;
  }

  if (campUiState.waLoteIndex >= campUiState.waLoteIds.length - 1) {
    limparLoteGuiado();
    const loteInfo = document.getElementById('camp-wa-preview-lote-info');
    if (loteInfo) {
      loteInfo.hidden = true;
      loteInfo.textContent = '';
    }
    const btnNext = document.getElementById('camp-wa-preview-next');
    if (btnNext) btnNext.hidden = true;
    notify('Lote guiado concluído.', SEVERITY.SUCCESS);
    return;
  }

  campUiState.waLoteIndex += 1;
  syncLoteGuiadoAtual();
  renderPreviewWhatsAppAtual();
}
