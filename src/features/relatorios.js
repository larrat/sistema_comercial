// @ts-check

import { C, D, State, PD } from '../app/store.js';
import { createScreenDom } from '../shared/dom.js';
import { abrirModal, fecharModal, fmt, pct, notify } from '../shared/utils.js';
import { SEVERITY } from '../shared/messages.js';
import {
  getHistoricoOportunidadesJogos,
  getOportunidadeJogoById,
  getOportunidadesJogosDaFilial,
  salvarValidacaoOportunidadeJogo,
  syncHistoricoOportunidadesJogos
} from './oportunidades-jogos.js';

/** @typedef {import('../types/domain').OportunidadeJogo} OportunidadeJogo */
/** @typedef {import('../types/domain').Pedido} Pedido */

const relDom = createScreenDom('relatorios', [
  'rel-ano',
  'rel-mes',
  'rel-met',
  'rel-context',
  'rel-resumo',
  'rel-oportunidades',
  'rel-validacoes',
  'rel-perf-met',
  'rel-perf-status',
  'rel-perf-clientes',
  'rel-cli-met',
  'rel-cli-status',
  'rel-cli-segmentos',
  'rel-val-id',
  'rel-val-context',
  'rel-val-pedido',
  'rel-val-obs'
]);

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * @param {string | undefined | null} v
 */
function fmtDataHora(v){
  if(!v) return '-';
  const d = new Date(v);
  if(Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * @param {string | undefined | null} mesRef
 */
function fmtPeriodo(mesRef){
  if(!mesRef || !/^\d{4}-\d{2}$/.test(String(mesRef))) return String(mesRef || '-');
  const [ano, mes] = String(mesRef).split('-');
  return `${MESES[Math.max(0, Number(mes) - 1)]}/${ano}`;
}

/**
 * @param {unknown} v
 */
function norm(v){
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * @param {string | undefined} clienteNome
 */
function buildPedidoOptions(clienteNome){
  const pedidos = PD()
    .filter(p => !clienteNome || norm(p.cli) === norm(clienteNome))
    .sort((a, b) => Number(b.num || 0) - Number(a.num || 0));

  const options = [`<option value="">Sem vincular pedido</option>`]
    .concat(pedidos.map(p => `<option value="${p.id}">#${p.num} • ${p.status || '-'} • ${fmt(p.total || 0)}</option>`));

  return {
    pedidos,
    html: options.join('')
  };
}

/**
 * @param {OportunidadeJogo[]} [hist]
 */
function ensureFiltrosAnoMes(hist = []){
  const anoSel = relDom.get('rel-ano');
  const mesSel = relDom.get('rel-mes');
  if(!anoSel || !mesSel) return;

  const anos = [...new Set(hist.map(item => String(item.ano_ref || '')))]
    .filter(Boolean)
    .sort((a, b) => Number(b) - Number(a));

  const anoAtual = String(new Date().getFullYear());
  const currentAno = anoSel.value || anos[0] || anoAtual;

  relDom.select(
    'filters',
    'rel-ano',
    [`<option value="">Todos os anos</option>`]
      .concat((anos.includes(anoAtual) ? anos : [anoAtual, ...anos]).filter((v, i, arr) => arr.indexOf(v) === i).map(ano => `<option value="${ano}">${ano}</option>`))
      .join(''),
    currentAno,
    'relatorios:ano'
  );

  relDom.select(
    'filters',
    'rel-mes',
    ['<option value="">Todos os meses</option>']
      .concat(MESES.map((mes, idx) => `<option value="${String(idx + 1).padStart(2, '0')}">${mes}</option>`))
      .join(''),
    mesSel.value || '',
    'relatorios:mes'
  );
}

function getFiltros(){
  return {
    ano: relDom.get('rel-ano')?.value || '',
    mes: relDom.get('rel-mes')?.value || ''
  };
}

/**
 * @param {OportunidadeJogo[]} [hist]
 * @returns {OportunidadeJogo[]}
 */
function filtrarHistorico(hist = []){
  const { ano, mes } = getFiltros();
  return hist.filter(item => {
    if(ano && String(item.ano_ref || '') !== String(ano)) return false;
    if(mes && String(item.mes_ref || '').split('-')[1] !== String(mes)) return false;
    return true;
  });
}

/**
 * @param {OportunidadeJogo[]} [hist]
 */
function renderResumoPeriodo(hist = []){
  const el = relDom.get('rel-resumo');
  if(!el) return;

  const grupos = {};
  hist.forEach(item => {
    const key = String(item.mes_ref || 'sem-mes');
    if(!grupos[key]){
      grupos[key] = { total: 0, validadas: 0 };
    }
    grupos[key].total += 1;
    if(item.validada) grupos[key].validadas += 1;
  });

  const rows = Object.entries(grupos)
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([mesRef, dados]) => {
      const pendentes = dados.total - dados.validadas;
      const taxa = dados.total > 0 ? (dados.validadas / dados.total) * 100 : 0;
      return `
        <tr>
          <td class="table-cell-strong">${fmtPeriodo(mesRef)}</td>
          <td class="table-align-center">${dados.total}</td>
          <td class="table-align-center table-cell-success table-cell-strong">${dados.validadas}</td>
          <td class="table-align-center">${pendentes}</td>
          <td class="table-align-right table-cell-strong">${pct(taxa)}</td>
        </tr>
      `;
    });

  relDom.html(
    'summary',
    'rel-resumo',
    rows.length
      ? `
        <div class="tw">
          <table class="tbl">
            <thead>
              <tr>
                <th>Periodo</th>
                <th class="table-align-center">Oportunidades</th>
                <th class="table-align-center">Validadas</th>
                <th class="table-align-center">Pendentes</th>
                <th class="table-align-right">Conversao</th>
              </tr>
            </thead>
            <tbody>${rows.join('')}</tbody>
          </table>
        </div>
      `
      : `<div class="empty"><div class="ico">RL</div><p>Sem oportunidades registradas no filtro.</p></div>`,
    'relatorios:resumo'
  );
}

/**
 * @param {OportunidadeJogo[]} [oportunidadesAtuais]
 * @param {OportunidadeJogo[]} [hist]
 */
function renderPendentes(oportunidadesAtuais = [], hist = []){
  const el = relDom.get('rel-oportunidades');
  if(!el) return;

  const validMap = new Map(hist.map(item => [item.id, item]));
  const pendentes = oportunidadesAtuais
    .map(item => validMap.get(item.id) || item)
    .filter(item => !item.validada);

  relDom.html(
    'pending',
    'rel-oportunidades',
    pendentes.length
      ? pendentes.map(item => `
          <div class="rrow rel-op-row">
            <span class="rel-op-dot"></span>
            <div class="rel-grow">
              <div class="rel-op-title">${item.cliente} • ${item.time}</div>
              <div class="rel-op-sub">${item.jogo_titulo || item.jogo?.titulo || '-'} • ${fmtDataHora(item.jogo_data_hora || item.jogo?.data_hora)}</div>
            </div>
            <button class="btn btn-sm" data-click="abrirValidacaoOportunidade('${item.id}')">Validar venda</button>
          </div>
        `).join('')
      : `<div class="empty"><div class="ico">OK</div><p>Sem oportunidades abertas para validar agora.</p></div>`,
    'relatorios:pendentes'
  );
}

/**
 * @param {OportunidadeJogo[]} [hist]
 */
function renderValidacoes(hist = []){
  const el = relDom.get('rel-validacoes');
  if(!el) return;

  const validacoes = hist
    .filter(item => item.validada)
    .sort((a, b) => String(b.validada_em || '').localeCompare(String(a.validada_em || '')))
    .slice(0, 12);

  relDom.html(
    'validated',
    'rel-validacoes',
    validacoes.length
      ? validacoes.map(item => `
          <div class="rrow rel-op-row">
            <span class="rel-op-dot rel-op-dot--success"></span>
            <div class="rel-grow">
              <div class="rel-op-title">${item.cliente} • ${item.time}</div>
              <div class="rel-op-sub">
                ${fmtPeriodo(item.mes_ref)} • ${item.pedido_num ? `Pedido #${item.pedido_num}` : 'Venda validada'}
                ${item.pedido_total ? ` • ${fmt(item.pedido_total)}` : ''}
              </div>
            </div>
            <span class="bdg bg">Validada</span>
          </div>
        `).join('')
      : `<div class="empty"><div class="ico">VR</div><p>Nenhuma oportunidade validada no filtro.</p></div>`,
    'relatorios:validacoes'
  );
}

function renderPerformanceComercial(){
  const pedidos = PD();
  const entregues = pedidos.filter(item => item.status === 'entregue');
  const faturamento = entregues.reduce((acc, item) => acc + Number(item.total || 0), 0);
  const ticketMedio = entregues.length ? faturamento / entregues.length : 0;

  relDom.html('performance', 'rel-perf-met', `
    <div class="met"><div class="ml">Pedidos</div><div class="mv">${pedidos.length}</div></div>
    <div class="met"><div class="ml">Entregues</div><div class="mv tone-success">${entregues.length}</div></div>
    <div class="met"><div class="ml">Faturamento</div><div class="mv">${fmt(faturamento)}</div></div>
    <div class="met"><div class="ml">Ticket medio</div><div class="mv">${fmt(ticketMedio)}</div></div>
  `, 'relatorios:perf-metricas');

  const statusMap = pedidos.reduce((acc, item) => {
    const key = String(item.status || 'sem_status');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));
  const totalPedidos = pedidos.length || 1;
  const statusRows = Object.entries(statusMap)
    .sort((a, b) => b[1] - a[1])
    .map(([status, qtd]) => `
      <div class="rrow rel-kpi-row">
        <div class="rel-kpi-label">${String(status).replace(/_/g, ' ')}</div>
        <div class="rel-kpi-bar"><span style="--rel-bar-pct:${Math.max(8, (qtd / totalPedidos) * 100)}%"></span></div>
        <div class="rel-kpi-value">${qtd}</div>
      </div>
    `).join('');

  relDom.html(
    'performance',
    'rel-perf-status',
    statusRows || `<div class="empty"><div class="ico">PD</div><p>Sem pedidos para compor este relatorio.</p></div>`,
    'relatorios:perf-status'
  );

  const clientes = pedidos.reduce((acc, item) => {
    const key = String(item.cli || 'Sem cliente');
    if(!acc[key]) acc[key] = { total: 0, pedidos: 0 };
    acc[key].total += Number(item.total || 0);
    acc[key].pedidos += 1;
    return acc;
  }, /** @type {Record<string, { total: number; pedidos: number }>} */ ({}));

  const topClientes = Object.entries(clientes)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8)
    .map(([nome, dados]) => `
      <div class="rrow rel-op-row">
        <span class="rel-op-dot rel-op-dot--success"></span>
        <div class="rel-grow">
          <div class="rel-op-title">${nome}</div>
          <div class="rel-op-sub">${dados.pedidos} pedido(s) • ${fmt(dados.total)}</div>
        </div>
      </div>
    `).join('');

  relDom.html(
    'performance',
    'rel-perf-clientes',
    topClientes || `<div class="empty"><div class="ico">CL</div><p>Nenhum cliente com pedido registrado ainda.</p></div>`,
    'relatorios:perf-clientes'
  );
}

function renderBaseClientes(){
  const clientes = C();
  const comAniversario = clientes.filter(item => String(item.data_aniversario || '').trim()).length;
  const marketing = clientes.filter(item => item.optin_marketing).length;
  const prospects = clientes.filter(item => String(item.status || '').toLowerCase() === 'prospecto').length;

  relDom.html('clientes', 'rel-cli-met', `
    <div class="met"><div class="ml">Clientes</div><div class="mv">${clientes.length}</div></div>
    <div class="met"><div class="ml">Com aniversario</div><div class="mv">${comAniversario}</div></div>
    <div class="met"><div class="ml">Opt-in marketing</div><div class="mv tone-success">${marketing}</div></div>
    <div class="met"><div class="ml">Prospectos</div><div class="mv tone-warning">${prospects}</div></div>
  `, 'relatorios:cli-metricas');

  const statusMap = clientes.reduce((acc, item) => {
    const key = String(item.status || 'sem_status');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));

  const statusRows = Object.entries(statusMap)
    .sort((a, b) => b[1] - a[1])
    .map(([status, qtd]) => `
      <div class="rrow rel-kpi-row">
        <div class="rel-kpi-label">${String(status).replace(/_/g, ' ')}</div>
        <div class="rel-kpi-bar"><span style="--rel-bar-pct:${Math.max(8, (qtd / Math.max(1, clientes.length)) * 100)}%"></span></div>
        <div class="rel-kpi-value">${qtd}</div>
      </div>
    `).join('');

  relDom.html(
    'clientes',
    'rel-cli-status',
    statusRows || `<div class="empty"><div class="ico">CL</div><p>Sem clientes cadastrados para analisar.</p></div>`,
    'relatorios:cli-status'
  );

  const segmentos = clientes.reduce((acc, item) => {
    const seg = String(item.seg || 'Sem segmento');
    if(!acc[seg]) acc[seg] = { total: 0, marketing: 0 };
    acc[seg].total += 1;
    if(item.optin_marketing) acc[seg].marketing += 1;
    return acc;
  }, /** @type {Record<string, { total: number; marketing: number }>} */ ({}));

  const segmentosRows = Object.entries(segmentos)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8)
    .map(([seg, dados]) => `
      <div class="rrow rel-op-row">
        <span class="rel-op-dot"></span>
        <div class="rel-grow">
          <div class="rel-op-title">${seg}</div>
          <div class="rel-op-sub">${dados.total} cliente(s) • ${dados.marketing} com opt-in marketing</div>
        </div>
      </div>
    `).join('');

  relDom.html(
    'clientes',
    'rel-cli-segmentos',
    segmentosRows || `<div class="empty"><div class="ico">SG</div><p>Sem segmentos suficientes para compor o relatorio.</p></div>`,
    'relatorios:cli-segmentos'
  );
}

/**
 * @param {import('../types/domain').OportunidadeJogo[]} oportunidadesAtuais
 * @param {number} pendentes
 * @param {number} total
 * @param {number} taxa
 */
function renderOportunidadesContext(oportunidadesAtuais, pendentes, total, taxa){
  const el = relDom.get('rel-context');
  if(!el) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  const seteDias = new Date(hoje);
  seteDias.setDate(seteDias.getDate() + 7);

  const jogosHoje = oportunidadesAtuais.filter(j => {
    if(!j.data_jogo) return false;
    const d = new Date(j.data_jogo);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === hoje.getTime();
  });

  const jogosSemana = oportunidadesAtuais.filter(j => {
    if(!j.data_jogo) return false;
    const d = new Date(j.data_jogo);
    d.setHours(0, 0, 0, 0);
    return d >= amanha && d <= seteDias;
  });

  if(jogosHoje.length){
    el.innerHTML = `
      <article class="context-card context-card--danger">
        <div class="context-card__head">
          <span class="bdg br">Hoje</span>
          <span class="context-card__kicker">Oportunidades</span>
        </div>
        <div class="context-card__title">${jogosHoje.length} jogo${jogosHoje.length > 1 ? 's' : ''} hoje — valide antes do apito</div>
        <div class="context-card__copy">Há oportunidades com jogo hoje que ainda podem ser validadas. Ação antes do início aumenta a taxa de conversão.</div>
        <div class="context-card__meta">${pendentes} pendente${pendentes !== 1 ? 's' : ''} no total — conversão atual ${pct(taxa)}</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="ir('relatorios')">Ver oportunidades</button>
        </div>
      </article>`;
    return;
  }

  if(jogosSemana.length){
    el.innerHTML = `
      <article class="context-card context-card--warning">
        <div class="context-card__head">
          <span class="bdg ba">Esta semana</span>
          <span class="context-card__kicker">Oportunidades</span>
        </div>
        <div class="context-card__title">${jogosSemana.length} jogo${jogosSemana.length > 1 ? 's' : ''} nos próximos 7 dias</div>
        <div class="context-card__copy">Janela de validação aberta. Prepare os pedidos agora para não perder o prazo dos jogos desta semana.</div>
        <div class="context-card__meta">${pendentes} pendente${pendentes !== 1 ? 's' : ''} — conversão atual ${pct(taxa)}</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="ir('relatorios')">Ver oportunidades</button>
        </div>
      </article>`;
    return;
  }

  if(taxa >= 70 && total > 0){
    el.innerHTML = `
      <article class="context-card context-card--success">
        <div class="context-card__head">
          <span class="bdg bb">Performance</span>
          <span class="context-card__kicker">Oportunidades</span>
        </div>
        <div class="context-card__title">Taxa de conversão acima de 70%</div>
        <div class="context-card__copy">Excelente aproveitamento das oportunidades. ${validadas(total, taxa)} de ${total} validadas — continue o ritmo.</div>
        <div class="context-card__meta">Nenhum jogo pendente nos próximos 7 dias</div>
      </article>`;
    return;
  }

  if(!total){
    el.innerHTML = `
      <article class="context-card context-card--info">
        <div class="context-card__head">
          <span class="bdg">Info</span>
          <span class="context-card__kicker">Oportunidades</span>
        </div>
        <div class="context-card__title">Nenhuma oportunidade registrada</div>
        <div class="context-card__copy">Sincronize os jogos para começar a rastrear e validar oportunidades comerciais por evento.</div>
      </article>`;
    return;
  }

  el.innerHTML = '';
}

/** @param {number} total @param {number} taxa */
function validadas(total, taxa){ return Math.round(total * taxa / 100); }

export function renderRelatorios(){
  const fid = State.FIL;
  if(!fid){
    relDom.html('metrics', 'rel-met', `<div class="empty"><p>Sem filial ativa.</p></div>`, 'relatorios:sem-filial');
    relDom.html('summary', 'rel-resumo', `<div class="empty"><p>Sem dados.</p></div>`, 'relatorios:sem-dados');
    relDom.html('pending', 'rel-oportunidades', `<div class="empty"><p>Sem dados.</p></div>`, 'relatorios:sem-pendentes');
    relDom.html('validated', 'rel-validacoes', `<div class="empty"><p>Sem dados.</p></div>`, 'relatorios:sem-validacoes');
    relDom.html('performance', 'rel-perf-met', `<div class="empty"><p>Sem dados.</p></div>`, 'relatorios:sem-perf-met');
    relDom.html('performance', 'rel-perf-status', `<div class="empty"><p>Sem dados.</p></div>`, 'relatorios:sem-perf-status');
    relDom.html('performance', 'rel-perf-clientes', `<div class="empty"><p>Sem dados.</p></div>`, 'relatorios:sem-perf-clientes');
    relDom.html('clientes', 'rel-cli-met', `<div class="empty"><p>Sem dados.</p></div>`, 'relatorios:sem-cli-met');
    relDom.html('clientes', 'rel-cli-status', `<div class="empty"><p>Sem dados.</p></div>`, 'relatorios:sem-cli-status');
    relDom.html('clientes', 'rel-cli-segmentos', `<div class="empty"><p>Sem dados.</p></div>`, 'relatorios:sem-cli-segmentos');
    return;
  }

  const oportunidadesAtuais = getOportunidadesJogosDaFilial(fid);
  const histCompleto = syncHistoricoOportunidadesJogos(fid, oportunidadesAtuais);

  ensureFiltrosAnoMes(histCompleto);

  const hist = filtrarHistorico(histCompleto);
  const total = hist.length;
  const validadas = hist.filter(item => item.validada).length;
  const pendentes = total - validadas;
  const taxa = total > 0 ? (validadas / total) * 100 : 0;

  relDom.html('metrics', 'rel-met', `
    <div class="met"><div class="ml">Oportunidades</div><div class="mv">${total}</div></div>
    <div class="met"><div class="ml">Validadas</div><div class="mv tone-success">${validadas}</div></div>
    <div class="met"><div class="ml">Pendentes</div><div class="mv tone-warning">${pendentes}</div></div>
    <div class="met"><div class="ml">Conversao</div><div class="mv">${pct(taxa)}</div></div>
  `, 'relatorios:metricas');

  renderOportunidadesContext(oportunidadesAtuais, pendentes, total, taxa);
  renderResumoPeriodo(hist);
  renderPendentes(oportunidadesAtuais, histCompleto);
  renderValidacoes(hist);
  renderPerformanceComercial();
  renderBaseClientes();
}

export function abrirValidacaoOportunidade(id){
  const fid = State.FIL;
  if(!fid) return;

  const item = getOportunidadeJogoById(fid, id);
  if(!item){
    notify('Oportunidade nao encontrada para validacao.', SEVERITY.WARNING);
    return;
  }

  const pedidoSel = relDom.get('rel-val-pedido');
  const { html } = buildPedidoOptions(item.cliente);

  relDom.value('rel-val-id', item.id);
  relDom.html(
    'validation',
    'rel-val-context',
    `
      <div class="rel-op-title">${item.cliente} • ${item.time}</div>
      <div class="rel-op-sub">${item.jogo_titulo || '-'} • ${fmtDataHora(item.jogo_data_hora)}</div>
    `,
    'relatorios:validacao-contexto'
  );
  if(pedidoSel){
    relDom.select('validation', 'rel-val-pedido', html, item.pedido_id || '', 'relatorios:validacao-pedidos');
  }
  relDom.value('rel-val-obs', item.observacao_validacao || '');

  abrirModal('modal-rel-validacao');
}

export function salvarValidacaoOportunidade(){
  const fid = State.FIL;
  const id = relDom.get('rel-val-id')?.value || '';
  if(!fid || !id) return;

  const pedidoId = relDom.get('rel-val-pedido')?.value || '';
  const obs = relDom.get('rel-val-obs')?.value || '';
  /** @type {Pedido | null} */
  const pedido = pedidoId ? (PD().find(item => item.id === pedidoId) || null) : null;

  salvarValidacaoOportunidadeJogo(fid, id, {
    pedido_id: pedido?.id || null,
    pedido_num: pedido?.num || null,
    pedido_total: pedido?.total || null,
    observacao_validacao: obs
  });

  fecharModal('modal-rel-validacao');
  renderRelatorios();
  notify('Oportunidade validada com sucesso no relatorio.', SEVERITY.SUCCESS);
}
