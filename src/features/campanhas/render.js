// @ts-check
/**
 * campanhas/render.js — todas as funções de renderização de UI.
 *
 * Importa de data.js (estado + helpers). Não importa de actions.js.
 * actions.js pode importar daqui para re-render após mutações.
 */

import { State, C } from '../../app/store.js';
import { abrirModal } from '../../shared/utils.js';
import { measureRender } from '../../shared/render-metrics.js';
import { esc } from '../../shared/sanitize.js';
import { buildSkeletonLines } from '../runtime-loading.js';

import {
  campDiag, campUiState, campanhasStatsCache, getCampanhasCache, getEnviosCache,
  isRuntimeBootstrapping, getCampanhasStats, contarResumoEnvios,
  labelCanal, labelStatusEnvio, formatarDataBR, escAttr,
  getEnvioById, getFilaWhatsApp, getEnviosHistoricoFiltrados, agruparHistoricoEnviosPorCampanha
} from './data.js';

/** @typedef {import('../../types/domain').Campanha} Campanha */
/** @typedef {import('../../types/domain').CampanhaEnvio} CampanhaEnvio */

// ── Helpers internos de render ────────────────────────────────────────────────

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

function badgeSaudeCampanha(campanha, envios) {
  if (!campanha?.ativo) return '<span class="bdg br">Inativa</span>';
  const fila = (envios || []).filter(e => e.campanha_id === campanha.id && (e.status === 'manual' || e.status === 'pendente')).length;
  if (fila > 0) return `<span class="bdg ba">Fila ${fila}</span>`;
  if (Number(campanha?.desconto || 0) <= 0 && !String(campanha?.cupom || '').trim()) return '<span class="bdg bk">Sem oferta</span>';
  return '<span class="bdg bg">Pronta</span>';
}

function renderResumoEnviosCampanha(envios) {
  const resumo = contarResumoEnvios(envios);
  return `
    <span class="bdg bb">Fila: ${resumo.pendentes}</span>
    <span class="bdg bg">Enviados: ${resumo.enviados}</span>
    <span class="bdg br">Falhas: ${resumo.falhas}</span>
  `;
}

export function isStatusFeedbackAtivo(envioId) {
  const feedback = campUiState.statusFeedback;
  if (!feedback || feedback.envioId !== envioId) return false;
  return Date.now() - Number(feedback.at || 0) < 180000;
}

// ── Diagnóstico ───────────────────────────────────────────────────────────────

export function renderCampDiag() {
  const el = document.getElementById('camp-diag');
  if (!el) return;

  const base = `Filial ativa: ${esc(campDiag.filialId || '') || '&mdash;'}`;
  const _ne = campDiag.carregadasFilial;
  const exibidas = `${_ne} campanha${_ne !== 1 ? 's' : ''} exibida${_ne !== 1 ? 's' : ''}`;
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
        <div class="camp-diag-panel__title">Diagnóstico da base de campanhas</div>
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

// ── Context panel ─────────────────────────────────────────────────────────────

function buildCampanhasContextPanelV2(campanhas, envios) {
  const resumo = contarResumoEnvios(envios);
  const primeiraFalha = envios.find(e => e.status === 'falhou') || null;
  const primeiraPendente = envios.find(e => e.status === 'manual' || e.status === 'pendente') || null;
  const primeiraAtivaSemFila = campanhas.find(c => {
    if (!c?.ativo) return false;
    return !envios.some(e => e.campanha_id === c.id);
  }) || null;

  /** @type {string[]} */
  const execucaoLocal = [];
  /** @type {string[]} */
  const aceleradoresExternos = [];

  const renderSection = (title, sub, cards) => {
    if (!cards.length) return '';
    return `
      <section class="context-panel__section">
        <div class="context-panel__section-head">
          <div class="context-panel__section-title">${title}</div>
          <div class="context-panel__section-sub">${sub}</div>
        </div>
        <div class="context-panel__grid">
          ${cards.join('')}
        </div>
      </section>
    `;
  };

  if (resumo.falhas > 0) {
    execucaoLocal.push(`
      <article class="context-card context-card--danger">
        <div class="context-card__head">
          <span class="bdg br">Revisão</span>
          <span class="context-card__kicker">Fila</span>
        </div>
        <div class="context-card__title">Falhas pedem tratamento manual</div>
        <div class="context-card__copy">${resumo.falhas} envio${resumo.falhas !== 1 ? 's' : ''} com falha no histórico precisando de revisão.</div>
        <div class="context-card__actions">
          ${primeiraFalha ? `<button class="btn btn-sm" data-click="abrirPreviewWhatsAppEnvio('${primeiraFalha.id}')">Abrir falha</button>` : ''}
        </div>
      </article>
    `);
  }

  if (resumo.pendentes > 0) {
    execucaoLocal.push(`
      <article class="context-card context-card--success">
        <div class="context-card__head">
          <span class="bdg bg">Próxima ação</span>
          <span class="context-card__kicker">Execução</span>
        </div>
        <div class="context-card__title">Fila pronta para execução</div>
        <div class="context-card__copy">${resumo.pendentes} envio${resumo.pendentes !== 1 ? 's' : ''} aguardando abertura no WhatsApp manual.</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="abrirWhatsAppLote()">Abrir lote</button>
          ${primeiraPendente ? `<button class="btn btn-p btn-sm" data-click="abrirPreviewWhatsAppEnvio('${primeiraPendente.id}')">Primeiro envio</button>` : ''}
        </div>
      </article>
    `);
  }

  if (primeiraAtivaSemFila) {
    execucaoLocal.push(`
      <article class="context-card context-card--info">
        <div class="context-card__head">
          <span class="bdg bb">Sugestão</span>
          <span class="context-card__kicker">Campanha local</span>
        </div>
        <div class="context-card__title">Campanha ativa sem rodada recente</div>
        <div class="context-card__copy">${esc(primeiraAtivaSemFila.nome)} está ativa, mas ainda não gerou fila nesta filial.</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="gerarFilaCampanha('${primeiraAtivaSemFila.id}')">Gerar fila</button>
        </div>
      </article>
    `);
  } else if (!campanhas.some(c => c.ativo)) {
    execucaoLocal.push(`
      <article class="context-card context-card--warning">
        <div class="context-card__head">
          <span class="bdg ba">Base</span>
          <span class="context-card__kicker">Campanha local</span>
        </div>
        <div class="context-card__title">Nenhuma campanha ativa</div>
        <div class="context-card__copy">Sem campanha ativa, a base perde timing de relacionamento e recuperação.</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="abrirNovaCampanha()">Nova campanha</button>
        </div>
      </article>
    `);
  }

  if (campDiag.candidatasOutrasFiliais?.length && campDiag.carregadasFilial === 0) {
    aceleradoresExternos.push(`
      <article class="context-card context-card--info">
        <div class="context-card__head">
          <span class="bdg bb">Acelerador</span>
          <span class="context-card__kicker">Outras filiais</span>
        </div>
        <div class="context-card__title">Campanhas prontas para importar</div>
        <div class="context-card__copy">${campDiag.candidatasOutrasFiliais.length} campanha${campDiag.candidatasOutrasFiliais.length !== 1 ? 's' : ''} de outras filiais prontas para acelerar a operação local.</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="adotarCampanhasParaFilialAtiva()">Importar agora</button>
        </div>
      </article>
    `);
  }

  const sections = [
    renderSection(
      'Execução local',
      'Tudo o que depende da fila e das campanhas desta filial agora.',
      execucaoLocal.slice(0, 3)
    ),
    renderSection(
      'Aceleradores externos',
      'Sugestões vindas de outras bases para acelerar a operação local.',
      aceleradoresExternos.slice(0, 1)
    )
  ].filter(Boolean);

  if (!sections.length) return '';

  return `
    <div class="context-panel context-panel--campanhas">
      <div class="context-panel__head">
        <div class="context-panel__title">Contexto operacional</div>
        <div class="context-panel__sub">Sinais separados entre execução desta tela e aceleradores de fora da fila local</div>
      </div>
      <div class="context-panel__sections">
        ${sections.join('')}
      </div>
    </div>
  `;
}

// ── Renders públicos ──────────────────────────────────────────────────────────

export function renderCampanhasMet() {
  return measureRender('campanhas', () => {
    const campanhas = getCampanhasCache();
    const envios = getEnviosCache();
    const { ativas, resumo } = getCampanhasStats(campanhas, envios);
    const el = document.getElementById('camp-met');
    if (!el) return;
    if (isRuntimeBootstrapping() && !campanhas.length && !envios.length) {
      el.innerHTML = `
        <div class="sk-grid sk-grid-3">
          <div class="sk-card">${buildSkeletonLines(2)}</div>
          <div class="sk-card">${buildSkeletonLines(2)}</div>
          <div class="sk-card">${buildSkeletonLines(2)}</div>
        </div>
      `;
      return;
    }

    el.innerHTML = `
      <div class="met metric-card camp-metric-card">
        <div class="metric-card__eyebrow">Base</div>
        <div class="ml">Campanhas</div>
        <div class="mv">${campanhas.length}</div>
        <div class="ms metric-card__foot">${ativas} ativa(s) no momento</div>
      </div>
      <div class="met metric-card camp-metric-card">
        <div class="metric-card__eyebrow">Operação</div>
        <div class="ml">Fila</div>
        <div class="mv">${resumo.pendentes}</div>
        <div class="ms metric-card__foot">${resumo.falhas} falha(s) aguardando revisão</div>
      </div>
      <div class="met metric-card camp-metric-card">
        <div class="metric-card__eyebrow">Resultado</div>
        <div class="ml">Enviados</div>
        <div class="mv">${resumo.enviados}</div>
        <div class="ms metric-card__foot">${envios.length} envio(s) no histórico</div>
      </div>
    `;
  }, 'metrics');
}

export function renderCampanhas() {
  return measureRender('campanhas', () => {
    const campanhas = getCampanhasCache();
    const envios = getEnviosCache();
    const el = document.getElementById('camp-lista');
    if (!el) return;
    if (isRuntimeBootstrapping() && !campanhas.length && !envios.length) {
      el.innerHTML = `<div class="sk-card">${buildSkeletonLines(6)}</div>`;
      return;
    }
    renderCampDiag();
    const contextHtml = buildCampanhasContextPanelV2(campanhas, envios);
    const { resumo } = getCampanhasStats(campanhas, envios);
    const pendentes = resumo.pendentes;
    const falhas = resumo.falhas;
    const enviadas = resumo.enviados;

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
    if (isMobile) {
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
              <div class="mobile-card-title">${esc(c.nome)}</div>
              <div class="mobile-card-tags mobile-card-tags-tight">
                <span class="bdg bk">${esc(c.tipo || 'aniversario')}</span>
                <span class="bdg bb">${labelCanal(c.canal)}</span>
                ${badgeSaudeCampanha(c, envios)}
              </div>
            </div>
            <div>${c.ativo ? '<span class="bdg bg">Ativa</span>' : '<span class="bdg br">Inativa</span>'}</div>
          </div>
          <div class="mobile-card-meta">
            <div>Antecedência: <b class="meta-emphasis">${Number(c.dias_antecedencia || 0)} dia(s)</b></div>
            <div>Desconto: <b class="meta-emphasis">${Number(c.desconto || 0)}%</b></div>
            <div>Cupom: <b class="meta-emphasis">${c.cupom ? esc(c.cupom) : '&mdash;'}</b></div>
          </div>
          <div class="mobile-card-actions">
            <button class="btn btn-sm" data-click="abrirCampanhaDet('${c.id}')">Detalhes</button>
            <button class="btn btn-sm" data-click="editarCampanha('${c.id}')">Editar</button>
            <button class="btn btn-p btn-sm" id="camp-run-${escAttr(c.id)}" data-click="gerarFilaCampanha('${c.id}')">Gerar fila</button>
            <button class="btn btn-sm" data-click="removerCampanha('${c.id}')">Excluir</button>
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
              <th>Antecedência</th>
              <th>Desconto</th>
              <th>Cupom</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${campanhas.map(c => `
              <tr>
                <td class="table-cell-strong">${esc(c.nome)}</td>
                <td><span class="bdg bk">${esc(c.tipo || 'aniversario')}</span></td>
                <td><span class="bdg bb">${labelCanal(c.canal)}</span></td>
                <td>${Number(c.dias_antecedencia || 0)} dia(s)</td>
                <td>${Number(c.desconto || 0)}%</td>
                <td>${c.cupom ? esc(c.cupom) : '&mdash;'}</td>
                <td>
                  <div class="fg2 gap-4">
                    ${c.ativo ? '<span class="bdg bg">Ativa</span>' : '<span class="bdg br">Inativa</span>'}
                    ${badgeSaudeCampanha(c, envios)}
                  </div>
                </td>
                <td>
                  <div class="fg2 camp-actions">
                    <button class="btn btn-sm" data-click="abrirCampanhaDet('${c.id}')">Detalhes</button>
                    <button class="btn btn-sm" data-click="editarCampanha('${c.id}')">Editar</button>
                    <button class="btn btn-p btn-sm" id="camp-run-${escAttr(c.id)}" data-click="gerarFilaCampanha('${c.id}')">Gerar fila</button>
                    <button class="btn btn-sm" data-click="removerCampanha('${c.id}')">Excluir</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }, 'list');
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
        <div class="camp-preview-title">${esc(nome || 'Campanha sem nome')}</div>
        <div class="camp-preview-sub">${esc(cliente?.nome || 'Cliente exemplo da filial ativa')}${assunto ? ` - ${esc(assunto)}` : ''}</div>
      </div>
      <div class="camp-preview-tags">
        ${desconto ? `<span class="bdg bb">${formatarValorPct(desconto)}</span>` : ''}
        ${cupom ? `<span class="bdg bk">${esc(cupom)}</span>` : ''}
      </div>
    </div>
    <div class="camp-preview-body">${esc(String(preview || 'Digite a mensagem para ver o preview.')).replace(/\n/g, '<br>')}</div>
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
          <div class="camp-detail-title">${esc(campanha.nome)}</div>
          <div class="camp-detail-sub">${esc(campanha.tipo || 'aniversario')} - ${labelCanal(campanha.canal)} - ${campanha.ativo ? 'Campanha ativa' : 'Campanha inativa'}</div>
        </div>
        <div class="camp-detail-status">
          ${campanha.ativo ? '<span class="bdg bg">Ativa</span>' : '<span class="bdg br">Inativa</span>'}
          ${badgeSaudeCampanha(campanha, envios)}
        </div>
      </div>

      <div class="camp-detail-grid">
        <div class="camp-detail-kpi">
          <div class="camp-detail-label">Antecedência</div>
          <div class="camp-detail-value">${Number(campanha.dias_antecedencia || 0)} dia(s)</div>
        </div>
        <div class="camp-detail-kpi">
          <div class="camp-detail-label">Oferta</div>
          <div class="camp-detail-value">${Number(campanha.desconto || 0)}%</div>
          <div class="camp-detail-meta">${campanha.cupom ? `Cupom ${esc(campanha.cupom)}` : 'Sem cupom'}</div>
        </div>
        <div class="camp-detail-kpi">
          <div class="camp-detail-label">Fila</div>
          <div class="camp-detail-value">${fila.length}</div>
          <div class="camp-detail-meta">${enviados.length} enviado(s) - ${falhas.length} falha(s)</div>
        </div>
      </div>

      <div class="panel camp-detail-section">
        <div class="pt">Mensagem da campanha</div>
        <div class="camp-detail-message">${esc(String(campanha.mensagem || '')).replace(/\n/g, '<br>')}</div>
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
                    <div class="camp-detail-row-title">${esc(cliente?.nome || envio.cliente_id)}</div>
                    <div class="camp-detail-row-sub">${esc(envio.destino || '') || '&mdash;'} - ${formatarDataBR(envio.data_ref)}${envio.criado_em ? ` - ${new Date(envio.criado_em).toLocaleString('pt-BR')}` : ''}</div>
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

export function renderFilaWhatsApp() {
  const envios = getFilaWhatsApp();
  const el = document.getElementById('camp-wa-fila');
  if (!el) return;
  if (isRuntimeBootstrapping() && !getEnviosCache().length) {
    el.innerHTML = `<div class="sk-card">${buildSkeletonLines(4)}</div>`;
    return;
  }

  if (!envios.length) {
    el.innerHTML = `<div class="empty"><div class="ico">WA</div><p>Nenhum WhatsApp pendente.</p></div>`;
    return;
  }

  const pendentes = envios.filter(e => e.status === 'manual' || e.status === 'pendente').length;
  const falhas = envios.filter(e => e.status === 'falhou').length;
  const selecionados = envios.filter(e => campUiState.waSelecionados.has(e.id)).length;
  const isMobile = window.matchMedia('(max-width: 1280px)').matches;

  if (isMobile) {
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
                <div class="mobile-card-title">${esc(cliente?.nome || e.cliente_id)}</div>
                <div class="mobile-card-sub">${esc(campanha?.nome || '') || '&mdash;'} - ${formatarDataBR(e.data_ref)}</div>
              </div>
              <label class="camp-select-chip"><input type="checkbox" ${campUiState.waSelecionados.has(e.id) ? 'checked' : ''} data-change="toggleEnvioFilaSelecionado('${e.id}')"><span>Selecionar</span></label>
            </div>
            <div class="mobile-card-meta">
              <div>Destino: <b class="meta-emphasis">${esc(e.destino || '') || '&mdash;'}</b></div>
              <div>Canal: <b class="table-cell-muted">${labelCanal(e.canal)}</b></div>
              <div>Status: <b class="table-cell-muted">${labelStatusEnvio(e.status)}</b></div>
            </div>
            <div class="mobile-card-actions">
              <button class="btn btn-p btn-sm" data-click="abrirPreviewWhatsAppEnvio('${e.id}')">Pré-visualizar</button>
              <button class="btn btn-sm" data-click="marcarEnvioEnviado('${e.id}')">Enviado</button>
              <button class="btn btn-sm" data-click="marcarEnvioFalhou('${e.id}')">Falhou</button>
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
                <td class="table-cell-strong">${esc(cliente?.nome || e.cliente_id)}</td>
                <td>${esc(e.destino || '') || '&mdash;'}</td>
                <td>${esc(campanha?.nome || '') || '&mdash;'}</td>
                <td>${formatarDataBR(e.data_ref)}</td>
                <td><span class="bdg ${e.status === 'enviado' ? 'bg' : e.status === 'falhou' ? 'br' : 'ba'}">${labelStatusEnvio(e.status)}</span></td>
                <td>
                  <div class="fg2">
                    <button class="btn btn-p btn-sm" data-click="abrirPreviewWhatsAppEnvio('${e.id}')">Pré-visualizar</button>
                    <button class="btn btn-sm" data-click="marcarEnvioEnviado('${e.id}')">Enviado</button>
                    <button class="btn btn-sm" data-click="marcarEnvioFalhou('${e.id}')">Falhou</button>
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
            <div class="camp-history-title">${esc(grupo.campanha?.nome || 'Campanha sem identificação')}</div>
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
                  <div class="mobile-card-title">${esc(cliente?.nome || e.cliente_id)}</div>
                  <div class="mobile-card-sub">${labelCanal(e.canal)} - ${formatarDataBR(e.data_ref)}</div>
                </div>
                <span class="bdg ${e.status === 'enviado' ? 'bg' : e.status === 'falhou' ? 'br' : 'ba'}">${labelStatusEnvio(e.status)}</span>
              </div>
              <div class="mobile-card-meta">
                <div>Destino: <b class="meta-emphasis">${esc(e.destino || '') || '&mdash;'}</b></div>
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
          <div class="camp-history-title">${esc(grupo.campanha?.nome || 'Campanha sem identificação')}</div>
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
                  <td class="table-cell-strong">${esc(cliente?.nome || e.cliente_id)}</td>
                  <td><span class="bdg bk">${labelCanal(e.canal)}</span></td>
                  <td>${esc(e.destino || '') || '&mdash;'}</td>
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

export function renderCampanhaEnvios() {
  return measureRender('campanhas', () => {
    const envios = getEnviosHistoricoFiltrados();
    const el = document.getElementById('camp-envios-lista');
    if (!el) return;
    if (isRuntimeBootstrapping() && !getEnviosCache().length) {
      el.innerHTML = `<div class="sk-card">${buildSkeletonLines(4)}</div>`;
      return;
    }

    if (!envios.length) {
      el.innerHTML = `<div class="empty"><div class="ico">VR</div><p>Nenhum envio registrado.</p></div>`;
      return;
    }

    const grupos = agruparHistoricoEnviosPorCampanha(envios);
    const isMobile = window.matchMedia('(max-width: 1280px)').matches;
    el.innerHTML = renderCampanhaEnviosAgrupados(grupos, isMobile);
  }, 'history');
}

export function renderPreviewWhatsAppAtual() {
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
          <div class="camp-preview-title">${esc(cliente?.nome || envio.cliente_id || 'Cliente')}</div>
          <div class="camp-preview-sub">${esc(campanha?.nome || 'Campanha manual')} - ${labelStatusEnvio(envio.status)}</div>
        </div>
        <div class="camp-preview-tags">
          ${emLote ? `<span class="bdg ba">Lote ${lotePos}</span>` : ''}
          <span class="bdg bb">${labelCanal(envio.canal)}</span>
        </div>
      </div>

      <div class="camp-wa-preview-grid">
        <div class="camp-wa-preview-field">
          <div class="camp-detail-label">Número</div>
          <div class="camp-wa-preview-value">${esc(envio.destino || '') || '&mdash;'}</div>
        </div>
        <div class="camp-wa-preview-field">
          <div class="camp-detail-label">Data de referência</div>
          <div class="camp-wa-preview-value">${formatarDataBR(envio.data_ref) || '&mdash;'}</div>
        </div>
      </div>

      <div class="panel camp-preview-panel">
        <div class="pt">Mensagem pronta</div>
        <div class="camp-preview-body">${esc(String(envio.mensagem || '')).replace(/\n/g, '<br>')}</div>
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
