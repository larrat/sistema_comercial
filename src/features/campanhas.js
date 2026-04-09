// @ts-check

import { SB } from '../app/api.js';
import { D, State, C } from '../app/store.js';
import { abrirModal, fecharModal, toast, uid, setButtonLoading, notify, focusField } from '../shared/utils.js';
import { MSG, SEVERITY } from '../shared/messages.js';

/** @typedef {import('../types/domain').Campanha} Campanha */
/** @typedef {import('../types/domain').CampanhaEnvio} CampanhaEnvio */
/** @typedef {import('../types/domain').CampanhaFilaResult} CampanhaFilaResult */
/**
 * @typedef {object} CampanhaDiagnostico
 * @property {string | null} filialId
 * @property {number} carregadasFilial
 * @property {number | null} totalBanco
 * @property {number | null} outrasFiliais
 * @property {Campanha[]} candidatasOutrasFiliais
 * @property {string} origem
 * @property {string | null} erro
 */

/** @type {CampanhaDiagnostico} */
let campDiag = {
  filialId: null,
  carregadasFilial: 0,
  totalBanco: null,
  outrasFiliais: null,
  candidatasOutrasFiliais: [],
  origem: 'cache',
  erro: null
};

const campUiState = {
  waSelecionados: new Set(),
  waPreviewAtualId: null,
  waLoteIds: [],
  waLoteIndex: -1,
  statusFeedback: null
};

/** @returns {Campanha[]} */
function getCampanhasCache() {
  if (!D.campanhas) D.campanhas = {};
  if (!D.campanhas[State.FIL]) D.campanhas[State.FIL] = [];
  return D.campanhas[State.FIL];
}

/** @returns {CampanhaEnvio[]} */
function getEnviosCache() {
  if (!D.campanhaEnvios) D.campanhaEnvios = {};
  if (!D.campanhaEnvios[State.FIL]) D.campanhaEnvios[State.FIL] = [];
  return D.campanhaEnvios[State.FIL];
}

function escAttr(v) {
  return String(v || '').replace(/"/g, '&quot;');
}

function normalizarNumeroWhatsAppBR(raw) {
  let s = String(raw || '').replace(/\D/g, '');
  if (!s) return '';
  if (s.startsWith('55')) return s;
  return '55' + s;
}

function buildWhatsAppUrl(numero, mensagem) {
  const num = normalizarNumeroWhatsAppBR(numero);
  const txt = encodeURIComponent(String(mensagem || ''));
  return `https://wa.me/${num}?text=${txt}`;
}

function formatarDataBR(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function labelCanal(v){
  const key = String(v || '').trim();
  if(key === 'whatsapp_manual') return 'WhatsApp manual';
  if(key === 'email') return 'E-mail';
  if(key === 'sms') return 'SMS';
  return key || '&mdash;';
}

function labelStatusEnvio(status){
  const key = String(status || '').trim();
  if(key === 'manual') return 'Manual';
  if(key === 'pendente') return 'Pendente';
  if(key === 'enviado') return 'Enviado';
  if(key === 'falhou') return 'Falhou';
  return key || '&mdash;';
}

export async function desfazerStatusEnvio(envioId) {
  const envio = getEnvioById(String(envioId || '').trim());
  if (!envio) return;

  if (!confirm(`Desfazer o status de ${labelStatusEnvio(envio.status).toLowerCase()} e devolver este envio para a fila manual?`)) return;

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

function contarResumoEnvios(envios) {
  return {
    pendentes: envios.filter(e => e.status === 'manual' || e.status === 'pendente').length,
    enviados: envios.filter(e => e.status === 'enviado').length,
    falhas: envios.filter(e => e.status === 'falhou').length
  };
}

function buildCampanhasContextPanel(campanhas, envios){
  const resumo = contarResumoEnvios(envios);
  const primeiraFalha = envios.find(e => e.status === 'falhou') || null;
  const primeiraPendente = envios.find(e => e.status === 'manual' || e.status === 'pendente') || null;
  const primeiraAtivaSemFila = campanhas.find(c => {
    if(!c?.ativo) return false;
    return !envios.some(e => e.campanha_id === c.id);
  }) || null;

  /** @type {string[]} */
  const cards = [];

  if(resumo.falhas > 0){
    cards.push(`
      <article class="context-card context-card--danger">
        <div class="context-card__head">
          <span class="bdg br">Revisao</span>
          <span class="context-card__kicker">Fila</span>
        </div>
        <div class="context-card__title">Falhas pedem tratamento manual</div>
        <div class="context-card__copy">${resumo.falhas} envio(s) com falha no historico e precisando de revisao.</div>
        <div class="context-card__actions">
          ${primeiraFalha ? `<button class="btn btn-sm" data-click="abrirPreviewWhatsAppEnvio('${primeiraFalha.id}')">Abrir falha</button>` : ''}
        </div>
      </article>
    `);
  }

  if(resumo.pendentes > 0){
    cards.push(`
      <article class="context-card context-card--success">
        <div class="context-card__head">
          <span class="bdg bg">Proxima acao</span>
          <span class="context-card__kicker">Operacao</span>
        </div>
        <div class="context-card__title">Fila pronta para execucao</div>
        <div class="context-card__copy">${resumo.pendentes} envio(s) aguardando abertura no WhatsApp manual.</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="abrirWhatsAppLote()">Abrir lote</button>
          ${primeiraPendente ? `<button class="btn btn-p btn-sm" data-click="abrirPreviewWhatsAppEnvio('${primeiraPendente.id}')">Primeiro envio</button>` : ''}
        </div>
      </article>
    `);
  }

  if(primeiraAtivaSemFila){
    cards.push(`
      <article class="context-card context-card--info">
        <div class="context-card__head">
          <span class="bdg bb">Sugestao</span>
          <span class="context-card__kicker">Campanha</span>
        </div>
        <div class="context-card__title">Campanha ativa sem rodada recente</div>
        <div class="context-card__copy">${primeiraAtivaSemFila.nome} esta ativa, mas ainda nao gerou fila nesta filial.</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="gerarFilaCampanha('${primeiraAtivaSemFila.id}')">Gerar fila</button>
        </div>
      </article>
    `);
  }else if(!campanhas.some(c => c.ativo)){
    cards.push(`
      <article class="context-card context-card--warning">
        <div class="context-card__head">
          <span class="bdg ba">Base</span>
          <span class="context-card__kicker">Campanha</span>
        </div>
        <div class="context-card__title">Nenhuma campanha ativa</div>
        <div class="context-card__copy">Sem campanha ativa, a base perde timing de relacionamento e recuperacao.</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="abrirNovaCampanha()">Nova campanha</button>
        </div>
      </article>
    `);
  }

  if(campDiag.candidatasOutrasFiliais?.length && campDiag.carregadasFilial === 0){
    cards.push(`
      <article class="context-card context-card--info">
        <div class="context-card__head">
          <span class="bdg bb">Base</span>
          <span class="context-card__kicker">Filial</span>
        </div>
        <div class="context-card__title">Campanhas prontas para importar</div>
        <div class="context-card__copy">${campDiag.candidatasOutrasFiliais.length} campanha(s) existem em outras filiais e podem acelerar a operacao local.</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="adotarCampanhasParaFilialAtiva()">Importar agora</button>
        </div>
      </article>
    `);
  }

  if(!cards.length) return '';

  return `
    <div class="context-panel context-panel--campanhas">
      <div class="context-panel__head">
        <div class="context-panel__title">Contexto operacional</div>
        <div class="context-panel__sub">Sinais da fila, da base ativa e da proxima acao recomendada</div>
      </div>
      <div class="context-panel__grid">
        ${cards.slice(0, 3).join('')}
      </div>
    </div>
  `;
}

function renderResumoEnviosCampanha(envios) {
  const resumo = contarResumoEnvios(envios);
  return `
    <span class="bdg bb">Fila: ${resumo.pendentes}</span>
    <span class="bdg bg">Enviados: ${resumo.enviados}</span>
    <span class="bdg br">Falhas: ${resumo.falhas}</span>
  `;
}

function agruparHistoricoEnviosPorCampanha(envios) {
  /** @type {Map<string, CampanhaEnvio[]>} */
  const grupos = new Map();
  envios.forEach(envio => {
    const key = String(envio.campanha_id || 'sem-campanha');
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)?.push(envio);
  });

  return Array.from(grupos.entries())
    .map(([campanhaId, itens]) => ({
      campanhaId,
      campanha: getCampanhasCache().find(c => c.id === campanhaId) || null,
      envios: itens.slice().sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')))
    }))
    .sort((a, b) => String(b.envios[0]?.criado_em || '').localeCompare(String(a.envios[0]?.criado_em || '')));
}

async function persistirStatusEnvio(payload) {
  const updateResult = await SB.toResult(() => SB.updateCampanhaEnvio(payload));
  if (!updateResult.ok) {
    notify(MSG.campanhas.envioUpdateFailed(updateResult.error?.message), SEVERITY.ERROR);
    return false;
  }

  const idx = getEnviosCache().findIndex(e => e.id === payload.id);
  if (idx >= 0) getEnviosCache()[idx] = payload;
  campUiState.statusFeedback = {
    envioId: payload.id,
    status: payload.status,
    at: Date.now()
  };

  renderCampanhasMet();
  renderFilaWhatsApp();
  renderCampanhaEnvios();
  return true;
}

function isStatusFeedbackAtivo(envioId) {
  const feedback = campUiState.statusFeedback;
  if (!feedback || feedback.envioId !== envioId) return false;
  return Date.now() - Number(feedback.at || 0) < 180000;
}

function syncLoteGuiadoAtual() {
  if (!campUiState.waLoteIds.length) return;
  campUiState.waLoteIds = campUiState.waLoteIds.filter(id => !!getEnvioById(id));
  if (!campUiState.waLoteIds.length) {
    campUiState.waLoteIndex = -1;
    campUiState.waPreviewAtualId = null;
    return;
  }
  if (campUiState.waLoteIndex < 0) campUiState.waLoteIndex = 0;
  if (campUiState.waLoteIndex >= campUiState.waLoteIds.length) campUiState.waLoteIndex = campUiState.waLoteIds.length - 1;
  campUiState.waPreviewAtualId = campUiState.waLoteIds[campUiState.waLoteIndex] || null;
}

function limparLoteGuiado() {
  campUiState.waLoteIds = [];
  campUiState.waLoteIndex = -1;
}

async function copyToClipboard(text, successMessage) {
  const value = String(text || '');
  if (!value.trim()) {
    notify('Nenhum conteudo disponivel para copiar.', SEVERITY.INFO);
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    notify(successMessage, SEVERITY.SUCCESS);
    return true;
  } catch {
    notify('Falha ao copiar para a area de transferencia.', SEVERITY.ERROR);
    return false;
  }
}

export async function marcarSelecionadosEnviados() {
  const selecionados = getFilaWhatsAppSelecionados();
  if (!selecionados.length) {
    notify('Selecione pelo menos um envio da fila para marcar como enviado.', SEVERITY.INFO);
    return;
  }

  if (!confirm(`Confirmar ${selecionados.length} envio(s) como enviado(s)?`)) return;

  for (const envio of selecionados) {
    const payload = {
      ...envio,
      status: 'enviado',
      enviado_em: new Date().toISOString(),
      erro: null
    };

    // eslint-disable-next-line no-await-in-loop
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

  if (!confirm(`Confirmar ${selecionados.length} envio(s) como falho(s)?`)) return;

  const motivo = prompt('Informe o motivo da falha para os envios selecionados:', '') || null;

  for (const envio of selecionados) {
    const payload = {
      ...envio,
      status: 'falhou',
      erro: motivo,
      enviado_em: null
    };

    // eslint-disable-next-line no-await-in-loop
    const ok = await persistirStatusEnvio(payload);
    if (!ok) continue;
  }

  campUiState.waSelecionados.clear();
  renderCampanhaEnvios();
  notify('Atencao: envios selecionados marcados como falhos.', SEVERITY.WARNING);
}

function badgeSaudeCampanha(campanha, envios){
  if(!campanha?.ativo) return '<span class="bdg br">Inativa</span>';
  const fila = (envios || []).filter(e => e.campanha_id === campanha.id && (e.status === 'manual' || e.status === 'pendente')).length;
  if(fila > 0) return `<span class="bdg ba">Fila ${fila}</span>`;
  if(Number(campanha?.desconto || 0) <= 0 && !String(campanha?.cupom || '').trim()) return '<span class="bdg bk">Sem oferta</span>';
  return '<span class="bdg bg">Pronta</span>';
}

function setBotaoGerarFilaLoading(campanhaId, loading){
  const btn = document.getElementById(`camp-run-${campanhaId}`);
  if(!btn) return;
  setButtonLoading(btn, loading, 'GER');
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

function getInputValue(id) {
  return document.getElementById(id)?.value ?? '';
}

function getClientePreviewCampanha() {
  const clientes = C() || [];
  return clientes[0] || null;
}

function formatarValorPct(v) {
  const num = Number(v || 0);
  return Number.isFinite(num) ? `${num}%` : '0%';
}

function substituirTokensCampanha(template, campanha = {}) {
  const cliente = getClientePreviewCampanha();
  const nome = String(cliente?.nome || 'Cliente especial').trim();
  const primeiroNome = nome.split(/\s+/)[0] || nome;
  const hoje = new Date();
  const validade = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 7)
    .toLocaleDateString('pt-BR');
  const values = {
    nome,
    apelido: primeiroNome,
    primeiro_nome: primeiroNome,
    desconto: formatarValorPct(campanha.desconto),
    cupom: campanha.cupom || 'SEM-CUPOM',
    validade
  };

  return String(template || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const value = values[key];
    return value == null ? '' : String(value);
  });
}

function limparSelecaoFilaInexistente(envios) {
  const idsAtuais = new Set((envios || []).map(e => e.id));
  campUiState.waSelecionados.forEach(id => {
    if (!idsAtuais.has(id)) campUiState.waSelecionados.delete(id);
  });
}

function getEnviosHistoricoFiltrados() {
  const busca = String(getInputValue('camp-envios-busca') || '').trim().toLowerCase();
  const status = String(getInputValue('camp-envios-fil-status') || '').trim();
  const canal = String(getInputValue('camp-envios-fil-canal') || '').trim();

  return getEnviosCache()
    .slice()
    .filter(e => !status || String(e.status || '') === status)
    .filter(e => !canal || String(e.canal || '') === canal)
    .filter(e => {
      if (!busca) return true;
      const cliente = (C() || []).find(c => c.id === e.cliente_id);
      const haystack = [
        cliente?.nome,
        e.destino,
        e.cliente_id,
        e.mensagem
      ].join(' ').toLowerCase();
      return haystack.includes(busca);
    })
    .sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')));
}

function getFilaWhatsApp() {
  return getEnviosCache()
    .filter(e =>
      e.canal === 'whatsapp_manual' &&
      (e.status === 'manual' || e.status === 'pendente')
    )
    .sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')));
}

/**
 * @param {string} campanhaId
 * @returns {CampanhaEnvio | null}
 */
function getPrimeiroEnvioWhatsAppPendenteCampanha(campanhaId) {
  return getFilaWhatsApp().find(e =>
    e.campanha_id === campanhaId &&
    (e.status === 'manual' || e.status === 'pendente') &&
    !!String(e.destino || '').trim()
  ) || null;
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
    // Se o navegador restringir o write, seguimos com a aba aberta.
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

function getFilaWhatsAppSelecionados() {
  const envios = getFilaWhatsApp().filter(e => campUiState.waSelecionados.has(e.id));
  limparSelecaoFilaInexistente(getFilaWhatsApp());
  return envios;
}

/**
 * @param {string | null | undefined} envioId
 * @returns {CampanhaEnvio | null}
 */
function getEnvioById(envioId) {
  return getEnviosCache().find(e => e.id === envioId) || null;
}

function renderCampDiag() {
  const el = document.getElementById('camp-diag');
  if (!el) return;

  const base = `Filial ativa: ${campDiag.filialId || '&mdash;'}`;
  const exibidas = `${campDiag.carregadasFilial} campanha(s) exibida(s)`;
  const banco = campDiag.totalBanco == null ? '' : `${campDiag.totalBanco} no banco`;
  const outras = campDiag.outrasFiliais == null ? '' : `${campDiag.outrasFiliais} em outras filiais`;
  const origem = campDiag.origem ? `Origem: ${campDiag.origem}` : '';
  const podeImportar = (campDiag.candidatasOutrasFiliais || []).length > 0 && campDiag.carregadasFilial === 0;
  const acao = podeImportar
    ? ` <button class="btn btn-sm camp-diag-action" data-click="adotarCampanhasParaFilialAtiva()">Importar para filial ativa</button>`
    : '';

  el.innerHTML = `
    <div class="alert al-a camp-diag-alert camp-diag-panel">
      <div class="camp-diag-panel__main">
        <div class="camp-diag-panel__title">Diagn&oacute;stico da base de campanhas</div>
        <div class="camp-diag-panel__copy">${base}</div>
      </div>
      <div class="camp-diag-panel__meta">
        <span class="bdg bk">${exibidas}</span>
        ${banco ? `<span class="bdg bb">${banco}</span>` : ''}
        ${outras ? `<span class="bdg ba">${outras}</span>` : ''}
        ${origem ? `<span class="bdg bk">${origem}</span>` : ''}
      </div>
      ${acao ? `<div class="camp-diag-panel__actions">${acao}</div>` : ''}
    </div>`;
}

export async function carregarCampanhas() {
  campDiag = {
    filialId: State.FIL,
    carregadasFilial: 0,
    totalBanco: null,
    outrasFiliais: null,
    candidatasOutrasFiliais: [],
    origem: 'api-filial',
    erro: null
  };

  const campanhasResult = await SB.toResult(() => SB.getCampanhas(State.FIL));
  if (campanhasResult.ok) {
    const campanhas = campanhasResult.data;
    if (!D.campanhas) D.campanhas = {};
    D.campanhas[State.FIL] = campanhas || [];
    campDiag.carregadasFilial = D.campanhas[State.FIL].length;

    if (!D.campanhas[State.FIL].length) {
      const allResult = await SB.toResult(() => SB.getCampanhasAll());
      if (allResult.ok) {
        const all = allResult.data;
        const sameFilial = (all || []).filter(c => String(c.filial_id || '') === String(State.FIL || ''));
        const outrasFiliais = (all || []).filter(c => String(c.filial_id || '') !== String(State.FIL || ''));

        campDiag.totalBanco = (all || []).length;
        campDiag.outrasFiliais = Math.max(0, (all || []).length - sameFilial.length);
        campDiag.candidatasOutrasFiliais = outrasFiliais;

        if (sameFilial.length) {
          D.campanhas[State.FIL] = sameFilial;
          campDiag.carregadasFilial = sameFilial.length;
          campDiag.origem = 'api-fallback';
        } else if ((all || []).length) {
          campDiag.origem = 'api-sem-filial';
        }
      } else {
        campDiag.origem = 'api-filial';
        campDiag.erro = String(allResult.error?.message || allResult.error || '');
      }
    }

    renderCampDiag();
    return D.campanhas[State.FIL];
  }

  console.error('Falha ao carregar campanhas', campanhasResult.error);
  toast('Falha ao carregar campanhas do banco. Exibindo dados locais.');
  campDiag.origem = 'cache';
  campDiag.erro = String(campanhasResult.error?.message || campanhasResult.error || '');
  campDiag.carregadasFilial = getCampanhasCache().length;
  renderCampDiag();
  return getCampanhasCache();
}

export async function carregarCampanhaEnvios() {
  const enviosResult = await SB.toResult(() => SB.getCampanhaEnvios(State.FIL));
  if (enviosResult.ok) {
    const envios = enviosResult.data;
    if (!D.campanhaEnvios) D.campanhaEnvios = {};
    D.campanhaEnvios[State.FIL] = envios || [];
    return D.campanhaEnvios[State.FIL];
  }
  console.error('Falha ao carregar envios de campanhas', enviosResult.error);
  toast('Falha ao carregar envios do banco. Exibindo dados locais.');
  return getEnviosCache();
}

export async function refreshCampanhasTela() {
  await Promise.all([carregarCampanhas(), carregarCampanhaEnvios()]);
  renderCampanhasMet();
  renderCampanhas();
  renderFilaWhatsApp();
  renderCampanhaEnvios();
}

export async function adotarCampanhasParaFilialAtiva() {
  const candidatas = campDiag.candidatasOutrasFiliais || [];
  if (!candidatas.length) {
    toast('Nenhuma campanha disponivel para importar.');
    return;
  }

  const atuais = getCampanhasCache();
  const existentes = new Set(
    atuais.map(c => [c.nome, c.tipo, c.canal, Number(c.dias_antecedencia || 0)].join('|').toLowerCase())
  );

  const paraImportar = candidatas.filter(c => {
    const k = [c.nome, c.tipo, c.canal, Number(c.dias_antecedencia || 0)].join('|').toLowerCase();
    return !existentes.has(k);
  });

  if (!paraImportar.length) {
    toast('As campanhas candidatas ja existem na filial ativa.');
    return;
  }

  let importadas = 0;
  let falhasPersistencia = 0;

  for (const c of paraImportar) {
    const nova = {
      ...c,
      id: uid(),
      filial_id: State.FIL
    };

    const persistResult = await SB.toResult(() => SB.upsertCampanha(nova));
    if (!persistResult.ok) {
      falhasPersistencia++;
      console.error('Falha ao persistir campanha importada', nova, persistResult.error);
    }

    atuais.unshift(nova);
    importadas++;
  }

  renderCampanhasMet();
  renderCampanhas();
  toast(`Importacao concluida: ${importadas} campanha(s), ${falhasPersistencia} falha(s) de persistencia.`);
}

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
  setInputValue('camp-mensagem', 'Ola, {{nome}}!\n\nPreparamos uma condicao especial para voce:\n{{desconto}} de desconto com o cupom {{cupom}}.\n\nValido ate {{validade}}.');
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
  const campanha = getCampanhasCache().find(c => c.id === id);
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

export function renderCampanhaPreview() {
  const el = document.getElementById('camp-preview');
  if (!el) return;

  const nome = getInputValue('camp-nome').trim();
  const mensagem = getInputValue('camp-mensagem').trim();
  const assunto = getInputValue('camp-assunto').trim();
  const cupom = getInputValue('camp-cupom').trim();
  const desconto = Number(getInputValue('camp-desconto') || 0);
  const cliente = getClientePreviewCampanha();
  const preview = substituirTokensCampanha(mensagem, { cupom, desconto });

  el.innerHTML = `
    <div class="camp-preview-head">
      <div>
        <div class="camp-preview-title">${nome || 'Campanha sem nome'}</div>
        <div class="camp-preview-sub">${cliente?.nome || 'Cliente exemplo da filial ativa'}${assunto ? ` - ${assunto}` : ''}</div>
      </div>
      <div class="camp-preview-tags">
        ${desconto ? `<span class="bdg bb">${formatarValorPct(desconto)}</span>` : ''}
        ${cupom ? `<span class="bdg bk">${cupom}</span>` : ''}
      </div>
    </div>
    <div class="camp-preview-body">${String(preview || 'Digite a mensagem para ver o preview.').replace(/\n/g, '<br>')}</div>
  `;
}

export async function salvarCampanha() {
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
    notify(MSG.forms.required('Nome da campanha'), SEVERITY.WARNING);
    focusField('camp-nome', { markError: true });
    return;
  }

  if (!mensagem) {
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
    console.error('Erro ao salvar campanha no banco', saveResult.error);
    notify(MSG.campanhas.saveFailed(saveResult.error?.message), SEVERITY.ERROR);
    return;
  }

  const list = getCampanhasCache();
  const idx = list.findIndex(c => c.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);

  fecharModal('modal-campanha');
  renderCampanhasMet();
  renderCampanhas();
  notify(State.editIds?.campanha ? 'Sucesso: campanha atualizada e pronta para uso.' : 'Sucesso: campanha criada e pronta para uso.', SEVERITY.SUCCESS);
}

export async function removerCampanha(id) {
  if (!confirm('Remover campanha?')) return;

  const deleteResult = await SB.toResult(() => SB.deleteCampanha(id));
  if (!deleteResult.ok) {
    console.error('Erro ao remover campanha no banco', deleteResult.error);
    notify('Erro: nao foi possivel remover no banco. Acao: tente novamente.', SEVERITY.ERROR);
    return;
  }

  D.campanhas[State.FIL] = getCampanhasCache().filter(c => c.id !== id);
  renderCampanhasMet();
  renderCampanhas();
  toast('Campanha removida.');
}

export function renderCampanhasMet() {
  const campanhas = getCampanhasCache();
  const envios = getEnviosCache();

  const ativas = campanhas.filter(c => c.ativo).length;
  const pendentes = envios.filter(e => e.status === 'pendente' || e.status === 'manual').length;
  const enviados = envios.filter(e => e.status === 'enviado').length;
  const falhas = envios.filter(e => e.status === 'falhou').length;

  const el = document.getElementById('camp-met');
  if (!el) return;

  el.innerHTML = `
    <div class="met metric-card camp-metric-card">
      <div class="metric-card__eyebrow">Base</div>
      <div class="ml">Campanhas</div>
      <div class="mv">${campanhas.length}</div>
      <div class="ms metric-card__foot">${ativas} ativa(s) no momento</div>
    </div>
    <div class="met metric-card camp-metric-card">
      <div class="metric-card__eyebrow">Opera&ccedil;&atilde;o</div>
      <div class="ml">Fila</div>
      <div class="mv">${pendentes}</div>
      <div class="ms metric-card__foot">${falhas} falha(s) aguardando revis&atilde;o</div>
    </div>
    <div class="met metric-card camp-metric-card">
      <div class="metric-card__eyebrow">Resultado</div>
      <div class="ml">Enviados</div>
      <div class="mv">${enviados}</div>
      <div class="ms metric-card__foot">${envios.length} envio(s) no hist&oacute;rico</div>
    </div>
  `;
}

export function renderCampanhas() {
  const campanhas = getCampanhasCache();
  const envios = getEnviosCache();
  const el = document.getElementById('camp-lista');
  if (!el) return;
  renderCampDiag();
  const contextHtml = buildCampanhasContextPanel(campanhas, envios);

  const pendentes = envios.filter(e => e.status === 'pendente' || e.status === 'manual').length;
  const falhas = envios.filter(e => e.status === 'falhou').length;
  const enviadas = envios.filter(e => e.status === 'enviado').length;

  if (!campanhas.length) {
    el.innerHTML = `
      ${contextHtml}
      <div class="camp-quick camp-summary-strip">
        <span class="bdg bb">Fila: ${pendentes}</span>
        <span class="bdg br">Falhas: ${falhas}</span>
        <span class="bdg bg">Enviadas: ${enviadas}</span>
      </div>
      <div class="empty"><div class="ico">CP</div><p>Nenhuma campanha cadastrada.</p></div>
    `;
    return;
  }

  const isMobile = window.matchMedia('(max-width: 1280px)').matches;
  if(isMobile){
    el.innerHTML = `
      ${contextHtml}
      <div class="camp-quick camp-summary-strip">
        <span class="bdg bb">Fila: ${pendentes}</span>
        <span class="bdg br">Falhas: ${falhas}</span>
        <span class="bdg bg">Enviadas: ${enviadas}</span>
      </div>
      ${campanhas.map(c => `
      <div class="mobile-card">
        <div class="mobile-card-head">
          <div class="mobile-card-grow">
            <div class="mobile-card-title">${c.nome}</div>
            <div class="mobile-card-tags mobile-card-tags-tight">
              <span class="bdg bk">${c.tipo || 'aniversario'}</span>
              <span class="bdg bb">${labelCanal(c.canal)}</span>
              ${badgeSaudeCampanha(c, envios)}
            </div>
          </div>
          <div>${c.ativo ? '<span class="bdg bg">Ativa</span>' : '<span class="bdg br">Inativa</span>'}</div>
        </div>

        <div class="mobile-card-meta">
          <div>Antecedencia: <b class="meta-emphasis">${Number(c.dias_antecedencia || 0)} dia(s)</b></div>
          <div>Desconto: <b class="meta-emphasis">${Number(c.desconto || 0)}%</b></div>
          <div>Cupom: <b class="meta-emphasis">${c.cupom || '&mdash;'}</b></div>
        </div>

        <div class="mobile-card-actions">
          <button class="btn btn-sm" title="Detalhes da campanha" data-click="abrirCampanhaDet('${c.id}')">Detalhes</button>
          <button class="btn btn-sm" title="Editar campanha" data-click="editarCampanha('${c.id}')">Editar</button>
          <button class="btn btn-p btn-sm" id="camp-run-${escAttr(c.id)}" title="Gerar fila de envio" data-click="gerarFilaCampanha('${c.id}')">Gerar fila</button>
          <button class="btn btn-sm" title="Remover campanha" data-click="removerCampanha('${c.id}')">Excluir</button>
        </div>
      </div>
    `).join('')}
    `;
    return;
  }

  el.innerHTML = `
    ${contextHtml}
    <div class="camp-quick camp-summary-strip">
      <span class="bdg bb">Fila: ${pendentes}</span>
      <span class="bdg br">Falhas: ${falhas}</span>
      <span class="bdg bg">Enviadas: ${enviadas}</span>
    </div>
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Canal</th>
            <th>Antecedencia</th>
            <th>Desconto</th>
            <th>Cupom</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${campanhas.map(c => `
            <tr>
              <td class="table-cell-strong">${c.nome}</td>
              <td><span class="bdg bk">${c.tipo || 'aniversario'}</span></td>
              <td><span class="bdg bb">${labelCanal(c.canal)}</span></td>
              <td>${Number(c.dias_antecedencia || 0)} dia(s)</td>
              <td>${Number(c.desconto || 0)}%</td>
              <td>${c.cupom || '&mdash;'}</td>
              <td>
                <div class="fg2 gap-4">
                  ${c.ativo ? '<span class="bdg bg">Ativa</span>' : '<span class="bdg br">Inativa</span>'}
                  ${badgeSaudeCampanha(c, envios)}
                </div>
              </td>
              <td>
                <div class="fg2 camp-actions">
                  <button class="btn btn-sm" title="Detalhes da campanha" data-click="abrirCampanhaDet('${c.id}')">Detalhes</button>
                  <button class="btn btn-sm" title="Editar campanha" data-click="editarCampanha('${c.id}')">Editar</button>
                  <button class="btn btn-p btn-sm" id="camp-run-${escAttr(c.id)}" title="Gerar fila de envio" data-click="gerarFilaCampanha('${c.id}')">Gerar fila</button>
                  <button class="btn btn-sm" title="Remover campanha" data-click="removerCampanha('${c.id}')">Excluir</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function abrirCampanhaDet(campanhaId) {
  const campanha = getCampanhasCache().find(c => c.id === campanhaId);
  const box = document.getElementById('campanha-det-box');
  if (!campanha || !box) return;

  const envios = getEnviosCache().filter(e => e.campanha_id === campanha.id);
  const fila = envios.filter(e => e.status === 'manual' || e.status === 'pendente');
  const enviados = envios.filter(e => e.status === 'enviado');
  const falhas = envios.filter(e => e.status === 'falhou');
  const recentes = envios
    .slice()
    .sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')))
    .slice(0, 5);

  box.innerHTML = `
    <div class="camp-detail">
      <div class="camp-detail-head fb">
        <div>
          <div class="camp-detail-title">${campanha.nome}</div>
          <div class="camp-detail-sub">${campanha.tipo || 'aniversario'} - ${labelCanal(campanha.canal)} - ${campanha.ativo ? 'Campanha ativa' : 'Campanha inativa'}</div>
        </div>
        <div class="camp-detail-status">
          ${campanha.ativo ? '<span class="bdg bg">Ativa</span>' : '<span class="bdg br">Inativa</span>'}
          ${badgeSaudeCampanha(campanha, envios)}
        </div>
      </div>

      <div class="camp-detail-grid">
        <div class="camp-detail-kpi">
          <div class="camp-detail-label">Antecedencia</div>
          <div class="camp-detail-value">${Number(campanha.dias_antecedencia || 0)} dia(s)</div>
        </div>
        <div class="camp-detail-kpi">
          <div class="camp-detail-label">Oferta</div>
          <div class="camp-detail-value">${Number(campanha.desconto || 0)}%</div>
          <div class="camp-detail-meta">${campanha.cupom ? `Cupom ${campanha.cupom}` : 'Sem cupom'}</div>
        </div>
        <div class="camp-detail-kpi">
          <div class="camp-detail-label">Fila</div>
          <div class="camp-detail-value">${fila.length}</div>
          <div class="camp-detail-meta">${enviados.length} enviado(s) - ${falhas.length} falha(s)</div>
        </div>
      </div>

      <div class="panel camp-detail-section">
        <div class="pt">Mensagem da campanha</div>
        <div class="camp-detail-message">${String(campanha.mensagem || '').replace(/\n/g, '<br>')}</div>
      </div>

      <div class="panel camp-detail-section">
        <div class="pt">Envios recentes</div>
        ${recentes.length ? `
          <div class="camp-detail-list">
            ${recentes.map(envio => {
              const cliente = (C() || []).find(c => c.id === envio.cliente_id);
              return `
                <div class="camp-detail-row">
                  <div class="camp-detail-row-main">
                    <div class="camp-detail-row-title">${cliente?.nome || envio.cliente_id}</div>
                    <div class="camp-detail-row-sub">${envio.destino || '&mdash;'} - ${formatarDataBR(envio.data_ref)}${envio.criado_em ? ` - ${new Date(envio.criado_em).toLocaleString('pt-BR')}` : ''}</div>
                  </div>
                  <span class="bdg ${envio.status === 'enviado' ? 'bg' : envio.status === 'falhou' ? 'br' : 'ba'}">${labelStatusEnvio(envio.status)}</span>
                </div>
              `;
            }).join('')}
          </div>
        ` : `<div class="empty" style="padding:12px"><p>Nenhum envio associado ainda.</p></div>`}
      </div>

      <div class="camp-detail-actions">
        <button class="btn" data-click="editarCampanha('${campanha.id}')">Editar campanha</button>
        <button class="btn btn-p" data-click="gerarFilaCampanha('${campanha.id}')">Gerar fila</button>
      </div>
    </div>
  `;

  abrirModal('modal-campanha-det');
}

export async function gerarFilaCampanha(campanhaId) {
  const campanha = getCampanhasCache().find(c => c.id === campanhaId);
  if (!campanha) {
    notify(MSG.campanhas.notFound, SEVERITY.ERROR);
    return;
  }

  const prepararWhatsApp = campanha.canal === 'whatsapp_manual';
  const janelaWhatsApp = prepararWhatsApp ? abrirJanelaPreparacaoWhatsApp() : null;

  setBotaoGerarFilaLoading(campanhaId, true);

  if(!campanha.ativo){
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
      notify('Fila gerada, mas nenhum envio com numero valido ficou disponivel para abrir no WhatsApp.', SEVERITY.WARNING);
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

export function renderFilaWhatsApp() {
  const envios = getFilaWhatsApp();

  const el = document.getElementById('camp-wa-fila');
  if (!el) return;
  limparSelecaoFilaInexistente(envios);

  if (!envios.length) {
    el.innerHTML = `<div class="empty"><div class="ico">WA</div><p>Nenhum WhatsApp pendente.</p></div>`;
    return;
  }

  const pendentes = envios.filter(e => e.status === 'manual' || e.status === 'pendente').length;
  const falhas = envios.filter(e => e.status === 'falhou').length;
  const selecionados = envios.filter(e => campUiState.waSelecionados.has(e.id)).length;
  const isMobile = window.matchMedia('(max-width: 1280px)').matches;

  if(isMobile){
    el.innerHTML = `
      <div class="camp-quick camp-summary-strip">
        <span class="bdg bb">Pendentes: ${pendentes}</span>
        <span class="bdg br">Falhas: ${falhas}</span>
        <span class="bdg bk">Selecionados: ${selecionados}</span>
      </div>
      ${envios.map(e => {
        const cliente = (C() || []).find(c => c.id === e.cliente_id);
        const campanha = getCampanhasCache().find(c => c.id === e.campanha_id);
        return `
          <div class="mobile-card">
            <div class="mobile-card-head">
              <div class="mobile-card-grow">
                <div class="mobile-card-title">${cliente?.nome || e.cliente_id}</div>
                <div class="mobile-card-sub">${campanha?.nome || '&mdash;'} - ${formatarDataBR(e.data_ref)}</div>
              </div>
              <label class="camp-select-chip"><input type="checkbox" ${campUiState.waSelecionados.has(e.id) ? 'checked' : ''} data-change="toggleEnvioFilaSelecionado('${e.id}')"><span>Selecionar</span></label>
            </div>
            <div class="mobile-card-meta">
              <div>Destino: <b class="meta-emphasis">${e.destino || '&mdash;'}</b></div>
              <div>Canal: <b class="table-cell-muted">${labelCanal(e.canal)}</b></div>
              <div>Status: <b class="table-cell-muted">${labelStatusEnvio(e.status)}</b></div>
            </div>
            <div class="mobile-card-actions">
              <button class="btn btn-p btn-sm" data-click="abrirPreviewWhatsAppEnvio('${e.id}')">Pre-visualizar</button>
              <button class="btn btn-sm" title="Marcar como enviado" data-click="marcarEnvioEnviado('${e.id}')">Enviado</button>
              <button class="btn btn-sm" title="Marcar como falhou" data-click="marcarEnvioFalhou('${e.id}')">Falhou</button>
            </div>
          </div>
        `;
      }).join('')}
    `;
    return;
  }

  el.innerHTML = `
    <div class="camp-quick camp-summary-strip">
      <span class="bdg bb">Pendentes: ${pendentes}</span>
      <span class="bdg br">Falhas: ${falhas}</span>
      <span class="bdg bk">Selecionados: ${selecionados}</span>
    </div>
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th class="table-select-col table-align-center">Sel</th>
            <th>Cliente</th>
            <th>Destino</th>
            <th>Campanha</th>
            <th>Data ref</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${envios.map(e => {
            const cliente = (C() || []).find(c => c.id === e.cliente_id);
            const campanha = getCampanhasCache().find(c => c.id === e.campanha_id);

            return `
              <tr>
                <td class="table-align-center"><input type="checkbox" ${campUiState.waSelecionados.has(e.id) ? 'checked' : ''} data-change="toggleEnvioFilaSelecionado('${e.id}')"></td>
                <td class="table-cell-strong">${cliente?.nome || e.cliente_id}</td>
                <td>${e.destino || '&mdash;'}</td>
                <td>${campanha?.nome || '&mdash;'}</td>
                <td>${formatarDataBR(e.data_ref)}</td>
                <td><span class="bdg ${e.status === 'enviado' ? 'bg' : e.status === 'falhou' ? 'br' : 'ba'}">${labelStatusEnvio(e.status)}</span></td>
                <td>
                  <div class="fg2">
                    <button class="btn btn-p btn-sm" data-click="abrirPreviewWhatsAppEnvio('${e.id}')">Pre-visualizar</button>
                    <button class="btn btn-sm" title="Marcar como enviado" data-click="marcarEnvioEnviado('${e.id}')">Enviado</button>
                    <button class="btn btn-sm" title="Marcar como falhou" data-click="marcarEnvioFalhou('${e.id}')">Falhou</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCampanhaEnviosAgrupados(grupos, isMobile) {
  if (isMobile) {
    return grupos.map(grupo => `
      <div class="camp-history-group">
        <div class="camp-history-head">
          <div>
            <div class="camp-history-title">${grupo.campanha?.nome || 'Campanha sem identificacao'}</div>
            <div class="camp-history-sub">${grupo.campanha ? `${labelCanal(grupo.campanha.canal)} - ${grupo.envios.length} envio(s)` : `${grupo.envios.length} envio(s)`}</div>
          </div>
          <div class="camp-history-meta">
            ${renderResumoEnviosCampanha(grupo.envios)}
          </div>
        </div>
        ${grupo.envios.map(e => {
          const cliente = (C() || []).find(c => c.id === e.cliente_id);
          return `
            <div class="mobile-card ${isStatusFeedbackAtivo(e.id) ? 'camp-history-item-fresh' : ''}">
              <div class="mobile-card-head">
                <div class="mobile-card-grow">
                  <div class="mobile-card-title">${cliente?.nome || e.cliente_id}</div>
                  <div class="mobile-card-sub">${labelCanal(e.canal)} - ${formatarDataBR(e.data_ref)}</div>
                </div>
                <span class="bdg ${e.status === 'enviado' ? 'bg' : e.status === 'falhou' ? 'br' : 'ba'}">${labelStatusEnvio(e.status)}</span>
              </div>
              <div class="mobile-card-meta">
                <div>Destino: <b class="meta-emphasis">${e.destino || '&mdash;'}</b></div>
                <div>Criado em: <b class="table-cell-muted">${e.criado_em ? new Date(e.criado_em).toLocaleString('pt-BR') : '&mdash;'}</b></div>
                ${isStatusFeedbackAtivo(e.id) ? `<div><span class="bdg bb">Atualizado agora</span></div>` : ''}
              </div>
              ${(e.status === 'enviado' || e.status === 'falhou') ? `
                <div class="mobile-card-actions">
                  <button class="btn btn-sm" data-click="desfazerStatusEnvio('${e.id}')">Desfazer status</button>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `).join('');
  }

  return grupos.map(grupo => `
    <div class="camp-history-group">
      <div class="camp-history-head">
        <div>
          <div class="camp-history-title">${grupo.campanha?.nome || 'Campanha sem identificacao'}</div>
          <div class="camp-history-sub">${grupo.campanha ? `${labelCanal(grupo.campanha.canal)} - ${grupo.envios.length} envio(s)` : `${grupo.envios.length} envio(s)`}</div>
        </div>
        <div class="camp-history-meta">
          ${renderResumoEnviosCampanha(grupo.envios)}
        </div>
      </div>
      <div class="tw">
        <table class="tbl">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Canal</th>
              <th>Destino</th>
              <th>Status</th>
              <th>Data ref</th>
              <th>Criado em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${grupo.envios.map(e => {
              const cliente = (C() || []).find(c => c.id === e.cliente_id);
              return `
                <tr class="${isStatusFeedbackAtivo(e.id) ? 'camp-history-row-fresh' : ''}">
                  <td class="table-cell-strong">${cliente?.nome || e.cliente_id}</td>
                  <td><span class="bdg bk">${labelCanal(e.canal)}</span></td>
                  <td>${e.destino || '&mdash;'}</td>
                  <td><span class="bdg ${e.status === 'enviado' ? 'bg' : e.status === 'falhou' ? 'br' : 'ba'}">${labelStatusEnvio(e.status)}</span></td>
                  <td>${formatarDataBR(e.data_ref)}</td>
                  <td>${e.criado_em ? new Date(e.criado_em).toLocaleString('pt-BR') : '&mdash;'}</td>
                  <td>${(e.status === 'enviado' || e.status === 'falhou') ? `<button class="btn btn-sm" data-click="desfazerStatusEnvio('${e.id}')">Desfazer</button>` : '&mdash;'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `).join('');
}

function renderPreviewWhatsAppAtual() {
  const envio = getEnvioById(campUiState.waPreviewAtualId);
  const box = document.getElementById('camp-wa-preview-box');
  const btnNext = document.getElementById('camp-wa-preview-next');
  const loteInfo = document.getElementById('camp-wa-preview-lote-info');
  if (!envio || !box) return false;

  const cliente = (C() || []).find(c => c.id === envio.cliente_id);
  const campanha = getCampanhasCache().find(c => c.id === envio.campanha_id);
  const emLote = campUiState.waLoteIds.length > 1;
  const lotePos = emLote ? `${campUiState.waLoteIndex + 1} de ${campUiState.waLoteIds.length}` : '';

  box.innerHTML = `
    <div class="camp-wa-preview">
      <div class="camp-wa-preview-head">
        <div>
          <div class="camp-preview-title">${cliente?.nome || envio.cliente_id || 'Cliente'}</div>
          <div class="camp-preview-sub">${campanha?.nome || 'Campanha manual'} - ${labelStatusEnvio(envio.status)}</div>
        </div>
        <div class="camp-preview-tags">
          ${emLote ? `<span class="bdg ba">Lote ${lotePos}</span>` : ''}
          <span class="bdg bb">${labelCanal(envio.canal)}</span>
        </div>
      </div>

      <div class="camp-wa-preview-grid">
        <div class="camp-wa-preview-field">
          <div class="camp-detail-label">Numero</div>
          <div class="camp-wa-preview-value">${envio.destino || '&mdash;'}</div>
        </div>
        <div class="camp-wa-preview-field">
          <div class="camp-detail-label">Data de referencia</div>
          <div class="camp-wa-preview-value">${formatarDataBR(envio.data_ref) || '&mdash;'}</div>
        </div>
      </div>

      <div class="panel camp-preview-panel">
        <div class="pt">Mensagem pronta</div>
        <div class="camp-preview-body">${String(envio.mensagem || '').replace(/\n/g, '<br>')}</div>
      </div>
    </div>
  `;

  if (btnNext) btnNext.hidden = !emLote;
  if (loteInfo) {
    loteInfo.hidden = !emLote;
    loteInfo.textContent = emLote ? `Lote guiado: item ${lotePos}` : '';
  }
  return true;
}

export function renderCampanhaEnvios() {
  const envios = getEnviosHistoricoFiltrados();
  const el = document.getElementById('camp-envios-lista');
  if (!el) return;

  if (!envios.length) {
    el.innerHTML = `<div class="empty"><div class="ico">VR</div><p>Nenhum envio registrado.</p></div>`;
    return;
  }

  const grupos = agruparHistoricoEnviosPorCampanha(envios);
  const isMobile = window.matchMedia('(max-width: 1280px)').matches;
  el.innerHTML = renderCampanhaEnviosAgrupados(grupos, isMobile);
}

export function abrirPreviewWhatsAppEnvio(envioId) {
  const envio = getEnvioById(String(envioId || '').trim());
  if (!envio) {
    notify('Erro: envio nao encontrado para pre-visualizacao.', SEVERITY.ERROR);
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
    notify('Erro: preview expirou ou o envio nao esta mais disponivel.', SEVERITY.ERROR);
    return;
  }
  abrirWhatsAppEnvio(envio.id);
}

export async function abrirWhatsAppEnvio(envioId) {
  const envio = getEnviosCache().find(e => e.id === envioId);
  if (!envio) {
    notify('Erro: envio nao encontrado. Impacto: nao foi possivel abrir a conversa. Acao: atualize a fila e tente novamente.', SEVERITY.ERROR);
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
    notify('Erro: preview expirou ou o envio nao esta mais disponivel.', SEVERITY.ERROR);
    return;
  }
  await copyToClipboard(envio.destino, 'Numero copiado com sucesso.');
}

export async function copiarMensagemPreviewAtual() {
  const envio = getEnvioById(campUiState.waPreviewAtualId);
  if (!envio) {
    notify('Erro: preview expirou ou o envio nao esta mais disponivel.', SEVERITY.ERROR);
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
  const elegiveis = getFilaWhatsApp().filter(e => e.status === 'manual' || e.status === 'pendente');
  const todosSelecionados = elegiveis.length > 0 && elegiveis.every(e => campUiState.waSelecionados.has(e.id));

  if (todosSelecionados) elegiveis.forEach(e => campUiState.waSelecionados.delete(e.id));
  else elegiveis.forEach(e => campUiState.waSelecionados.add(e.id));

  renderFilaWhatsApp();
}

export function abrirWhatsAppLote() {
  const selecionados = getFilaWhatsAppSelecionados();
  if (!selecionados.length) {
    notify('Selecione pelo menos um envio da fila para iniciar o lote guiado.', SEVERITY.INFO);
    return;
  }

  campUiState.waLoteIds = selecionados
    .filter(envio => !!String(envio.destino || '').trim())
    .map(envio => envio.id);
  campUiState.waLoteIndex = 0;
  syncLoteGuiadoAtual();

  if (!campUiState.waPreviewAtualId) {
    notify('Nenhum envio selecionado possui numero valido para abrir o lote.', SEVERITY.WARNING);
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
    notify('Lote guiado concluido.', SEVERITY.SUCCESS);
    return;
  }

  campUiState.waLoteIndex += 1;
  syncLoteGuiadoAtual();
  renderPreviewWhatsAppAtual();
}

export async function marcarEnvioEnviado(envioId) {
  const envio = getEnviosCache().find(e => e.id === envioId);
  if (!envio) return;

  const cliente = (C() || []).find(c => c.id === envio.cliente_id);
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
  const envio = getEnviosCache().find(e => e.id === envioId);
  if (!envio) return;

  const cliente = (C() || []).find(c => c.id === envio.cliente_id);
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
  notify('Atencao: envio marcado como falho. Impacto: cliente nao recebeu a mensagem. Acao: revise o motivo e tente novo envio.', SEVERITY.WARNING);
}
