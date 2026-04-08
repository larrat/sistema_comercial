import { D, State, PD } from '../app/store.js';
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

const relDom = createScreenDom('relatorios', [
  'rel-ano',
  'rel-mes',
  'rel-met',
  'rel-resumo',
  'rel-oportunidades',
  'rel-validacoes',
  'rel-val-id',
  'rel-val-context',
  'rel-val-pedido',
  'rel-val-obs'
]);

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function fmtDataHora(v){
  if(!v) return '-';
  const d = new Date(v);
  if(Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtPeriodo(mesRef){
  if(!mesRef || !/^\d{4}-\d{2}$/.test(String(mesRef))) return String(mesRef || '-');
  const [ano, mes] = String(mesRef).split('-');
  return `${MESES[Math.max(0, Number(mes) - 1)]}/${ano}`;
}

function norm(v){
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

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

function filtrarHistorico(hist = []){
  const { ano, mes } = getFiltros();
  return hist.filter(item => {
    if(ano && String(item.ano_ref || '') !== String(ano)) return false;
    if(mes && String(item.mes_ref || '').split('-')[1] !== String(mes)) return false;
    return true;
  });
}

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
          <td style="font-weight:600">${fmtPeriodo(mesRef)}</td>
          <td style="text-align:center">${dados.total}</td>
          <td style="text-align:center;color:var(--g);font-weight:600">${dados.validadas}</td>
          <td style="text-align:center">${pendentes}</td>
          <td style="text-align:right;font-weight:600">${pct(taxa)}</td>
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
                <th style="text-align:center">Oportunidades</th>
                <th style="text-align:center">Validadas</th>
                <th style="text-align:center">Pendentes</th>
                <th style="text-align:right">Conversao</th>
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
            <div style="flex:1;min-width:0">
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
            <div style="flex:1;min-width:0">
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

export function renderRelatorios(){
  const fid = State.FIL;
  if(!fid){
    relDom.html('metrics', 'rel-met', `<div class="empty"><p>Sem filial ativa.</p></div>`, 'relatorios:sem-filial');
    relDom.html('summary', 'rel-resumo', `<div class="empty"><p>Sem dados.</p></div>`, 'relatorios:sem-dados');
    relDom.html('pending', 'rel-oportunidades', `<div class="empty"><p>Sem dados.</p></div>`, 'relatorios:sem-pendentes');
    relDom.html('validated', 'rel-validacoes', `<div class="empty"><p>Sem dados.</p></div>`, 'relatorios:sem-validacoes');
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

  renderResumoPeriodo(hist);
  renderPendentes(oportunidadesAtuais, histCompleto);
  renderValidacoes(hist);
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
  const pedido = pedidoId ? PD().find(item => item.id === pedidoId) : null;

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
