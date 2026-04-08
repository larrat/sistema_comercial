import { SB } from '../js/api.js';
import { D, State, P } from '../js/store.js';
import { abrirModal, fecharModal, fmt, fmtK, pct, uid, notify, focusField } from '../core/utils.js';
import { MSG, SEVERITY } from '../core/messages.js';

let calcSaldosMultiSafe = () => ({});

const MES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const JOGOS_API_URL_KEY = 'jogos_api_url';
const JOGOS_API_FILTRO_KEY = 'jogos_api_filtro';
const JOGOS_AUTO_SYNC_AT_KEY = 'jogos_auto_sync_at';
const JOGOS_AUTO_SYNC_TTL_MS = 30 * 60 * 1000;
const JOGOS_EXPIRY_GRACE_MS = 3 * 60 * 60 * 1000;

const jogosSyncPromises = new Map();

function getFilialCalendarioId(){
  const filiais = D.filiais || [];
  const byNome = filiais.find(f => String(f.nome || '').toLowerCase().includes('filial 1'));
  return byNome?.id || filiais[0]?.id || null;
}

function getJogosCache(fid){
  if(!D.jogos) D.jogos = {};
  if(!D.jogos[fid]) D.jogos[fid] = [];
  return D.jogos[fid];
}

function getJogoDateMs(jogo){
  const ts = new Date(jogo?.data_hora || 0).getTime();
  return Number.isNaN(ts) ? null : ts;
}

function isJogoExpirado(jogo, nowMs = Date.now()){
  const ts = getJogoDateMs(jogo);
  if(ts == null) return false;
  const status = String(jogo?.status || '').toLowerCase();
  if(status === 'cancelado' || status === 'realizado') return true;
  return (ts + JOGOS_EXPIRY_GRACE_MS) < nowMs;
}

function sortJogosAgenda(lista = []){
  return [...lista].sort((a, b) => new Date(a.data_hora || 0) - new Date(b.data_hora || 0));
}

async function purgeExpiredJogos(fid, { persist = true, silent = true } = {}){
  const cache = getJogosCache(fid);
  const expirados = cache.filter(j => isJogoExpirado(j));
  if(!expirados.length) return 0;

  D.jogos[fid] = cache.filter(j => !isJogoExpirado(j));

  if(persist){
    await Promise.all(expirados.map(async jogo => {
      try{
        await SB.deleteJogoAgenda(jogo.id);
      }catch(e){
        console.error('Erro ao limpar jogo expirado', jogo, e);
      }
    }));
  }

  if(!silent){
    notify(`Agenda atualizada: ${expirados.length} jogo(s) passado(s) removido(s).`, SEVERITY.INFO);
  }

  return expirados.length;
}

function getJogosAutoSyncAtMap(){
  try{
    return JSON.parse(localStorage.getItem(JOGOS_AUTO_SYNC_AT_KEY) || '{}') || {};
  }catch{
    return {};
  }
}

function setJogosAutoSyncAt(fid, timestamp = Date.now()){
  const map = getJogosAutoSyncAtMap();
  map[fid] = timestamp;
  localStorage.setItem(JOGOS_AUTO_SYNC_AT_KEY, JSON.stringify(map));
}

function shouldAutoSyncJogos(fid){
  const apiUrl = localStorage.getItem(JOGOS_API_URL_KEY) || '';
  if(!apiUrl) return false;
  const map = getJogosAutoSyncAtMap();
  const lastAt = Number(map[fid] || 0);
  return !lastAt || (Date.now() - lastAt) >= JOGOS_AUTO_SYNC_TTL_MS;
}

function fmtDataHora(v){
  if(!v) return 'â€”';
  const d = new Date(v);
  if(isNaN(d.getTime())) return String(v);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function normTxt(v){
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseTimes(v){
  const raw = Array.isArray(v)
    ? v
    : String(v || '').split(/[,;\n]+/);

  const seen = new Set();
  const out = [];

  raw.forEach(item => {
    const nome = String(item || '').trim();
    if(!nome) return;
    const key = normTxt(nome);
    if(seen.has(key)) return;
    seen.add(key);
    out.push(nome);
  });

  return out;
}

function jogoTemTime(j, time){
  const t = normTxt(time);
  if(!t) return false;
  return [j.mandante, j.visitante, j.titulo, j.campeonato]
    .map(normTxt)
    .some(x => x.includes(t));
}

function jogoEhDaSerie(j, serie = 'todas'){
  const s = String(serie || 'todas').toLowerCase();
  if(s === 'todas') return true;

  const camp = normTxt(j?.campeonato || '');
  if(!camp) return false;

  if(s === 'a') return /\bserie a\b|\bserie-a\b|\bseriea\b/.test(camp);
  if(s === 'b') return /\bserie b\b|\bserie-b\b|\bserieb\b/.test(camp);
  if(s === 'c') return /\bserie c\b|\bserie-c\b|\bseriec\b/.test(camp);
  return true;
}

function statusJogoExt(v){
  const s = String(v || '').toLowerCase();
  if(['finished', 'ft', 'realizado', 'fulltime'].includes(s)) return 'realizado';
  if(['cancelled', 'canceled', 'postponed', 'cancelado'].includes(s)) return 'cancelado';
  return 'agendado';
}

function pickDataHora(obj){
  if(obj?.strDate && obj?.strTime) return `${obj.strDate}T${obj.strTime}`;
  if(obj?.dateEvent && obj?.strTime) return `${obj.dateEvent}T${obj.strTime}`;
  if(obj?.dateEvent && obj?.time) return `${obj.dateEvent}T${obj.time}`;
  if(obj?.fixture?.date) return obj.fixture.date;
  if(obj?.fixture?.timestamp){
    const ts = Number(obj.fixture.timestamp);
    if(!isNaN(ts)) return new Date(ts * 1000).toISOString();
  }
  return (
    obj?.data_hora ||
    obj?.date ||
    obj?.utcDate ||
    obj?.datetime ||
    obj?.strTimestamp ||
    null
  );
}

function normalizeJogoExterno(raw){
  if(!raw || typeof raw !== 'object') return null;

  const home =
    raw.homeTeam?.name ||
    raw.teams?.home?.name ||
    raw.fixture?.teams?.home?.name ||
    raw.strHomeTeam ||
    raw.home ||
    raw.mandante ||
    '';

  const away =
    raw.awayTeam?.name ||
    raw.teams?.away?.name ||
    raw.fixture?.teams?.away?.name ||
    raw.strAwayTeam ||
    raw.away ||
    raw.visitante ||
    '';

  const data_hora = pickDataHora(raw);
  if(!data_hora) return null;

  const titulo =
    raw.titulo ||
    raw.title ||
    raw.name ||
    raw.strEvent ||
    (home || away ? `${home || 'Mandante'} x ${away || 'Visitante'}` : '');

  if(!titulo) return null;

  const extId =
    raw.id ||
    raw.idEvent ||
    raw.fixture?.id ||
    raw.match_id ||
    raw.game_id ||
    null;

  const campeonato =
    raw.competition?.name ||
    raw.league?.name ||
    raw.strLeague ||
    raw.campeonato ||
    null;

  const local =
    raw.venue?.name ||
    raw.fixture?.venue?.name ||
    raw.strVenue ||
    raw.local ||
    null;

  const status =
    statusJogoExt(raw.status?.short || raw.status?.type || raw.status || raw.strStatus);

  return {
    extId: extId ? String(extId) : null,
    titulo,
    campeonato,
    data_hora,
    mandante: home || null,
    visitante: away || null,
    local,
    status
  };
}

function stableJogoId(j){
  const base = [
    String(j.data_hora || ''),
    String(j.mandante || ''),
    String(j.visitante || ''),
    String(j.titulo || '')
  ].join('|').toLowerCase().trim();

  let hash = 0;
  for(let i = 0; i < base.length; i++){
    hash = ((hash << 5) - hash) + base.charCodeAt(i);
    hash |= 0;
  }

  return `sync-${Math.abs(hash)}`;
}

function extrairListaJogos(payload){
  if(Array.isArray(payload)) return payload;
  if(Array.isArray(payload?.matches)) return payload.matches;
  if(Array.isArray(payload?.response)) return payload.response;
  if(Array.isArray(payload?.events)) return payload.events;
  if(Array.isArray(payload?.data)) return payload.data;
  return [];
}

function getProxAnivDate(dataAniversario, baseDate){
  if(!dataAniversario) return null;
  const [, m, d] = String(dataAniversario).split('-').map(Number);
  if(!m || !d) return null;

  const y = baseDate.getFullYear();
  let aniv = new Date(y, m - 1, d);
  aniv.setHours(0, 0, 0, 0);

  if(aniv < baseDate){
    aniv = new Date(y + 1, m - 1, d);
    aniv.setHours(0, 0, 0, 0);
  }

  return aniv;
}

export function initDashboardModule(callbacks = {}){
  calcSaldosMultiSafe = callbacks.calcSaldosMulti || (() => ({}));
}

function getRange(){
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if(State.dashP === 'semana'){
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay() + 1);
    d.setHours(0, 0, 0, 0);
    return [d, now];
  }

  if(State.dashP === 'mes') return [new Date(y, m, 1), now];
  if(State.dashP === 'ano') return [new Date(y, 0, 1), now];

  return [new Date(2000, 0, 1), now];
}

function inR(ds, range){
  if(!ds) return false;
  const [from, to] = range;
  const d = new Date(ds + 'T00:00:00');
  return d >= from && d <= to;
}

export function setP(p, btn){
  State.dashP = p;

  document.querySelectorAll('#dash-pseg button').forEach(b => b.classList.remove('on'));
  if(btn) btn.classList.add('on');

  renderDash();
}

export function renderDashFilSel(){
  const s = document.getElementById('dash-fil');
  if(!s) return;

  const cur = s.value;
  s.innerHTML =
    '<option value="todas">Todas as filiais</option>' +
    (D.filiais || []).map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
  s.value = cur || 'todas';
}

export function renderDash(){
  const fsel = document.getElementById('dash-fil')?.value || 'todas';
  const serieSel = document.getElementById('dash-opp-camp')?.value || 'todas';
  const range = getRange();

  const pLabels = {
    semana:'Esta semana',
    mes:'Este mÃªs',
    ano:'Este ano',
    tudo:'Todos os perÃ­odos'
  };

  const fLabel =
    fsel === 'todas'
      ? 'Consolidado'
      : (D.filiais || []).find(f => f.id === fsel)?.nome || '';

  const desc = document.getElementById('dash-desc');
  if(desc) desc.textContent = fLabel + ' â€” ' + pLabels[State.dashP];

  renderDashJogos(fsel);

  const filIds = fsel === 'todas' ? (D.filiais || []).map(f => f.id) : [fsel];

  const allPeds = filIds.flatMap(fid =>
    (D.pedidos?.[fid] || []).map(p => ({ ...p, _fid: fid }))
  );

  const entregues = allPeds.filter(p => p.status === 'entregue' && inR(p.data, range));

  const fat = entregues.reduce((a, p) => a + (p.total || 0), 0);
  const lucro = entregues.reduce(
    (a, p) => a + (p.itens || []).reduce((b, i) => b + ((i.preco - i.custo) * i.qty), 0),
    0
  );
  const mg = fat > 0 ? (lucro / fat) * 100 : 0;
  const tk = entregues.length ? fat / entregues.length : 0;
  const abertos = allPeds.filter(p => ['orcamento','confirmado','em_separacao'].includes(p.status)).length;

  const met = document.getElementById('dash-met');
  if(met){
    met.innerHTML = `
      <div class="met">
        <div class="ml">Faturamento</div>
        <div class="mv kpi-value-sm">${fmt(fat)}</div>
        <div class="ms">${entregues.length} entregue(s)</div>
      </div>
      <div class="met">
        <div class="ml">Lucro bruto</div>
        <div class="mv kpi-value-sm ${lucro >= 0 ? 'tone-success' : 'tone-critical'}">${fmt(lucro)}</div>
      </div>
      <div class="met">
        <div class="ml">Margem</div>
        <div class="mv ${mg >= 15 ? 'tone-success' : mg >= 8 ? 'tone-warning' : 'tone-critical'}">${pct(mg)}</div>
      </div>
      <div class="met">
        <div class="ml">Ticket mÃ©dio</div>
        <div class="mv kpi-value-sm">${fmt(tk)}</div>
      </div>
      <div class="met">
        <div class="ml">Em aberto</div>
        <div class="mv tone-warning">${abertos}</div>
      </div>
    `;
  }

  const saldos = calcSaldosMultiSafe(filIds);
  const allProds = filIds.flatMap(fid =>
    (D.produtos?.[fid] || []).map(p => ({ ...p, _fid: fid }))
  );

  const crit = allProds.filter(p => {
    const s = saldos[p._fid + '_' + p.id];
    return s && s.saldo <= 0;
  });

  const baixo = allProds.filter(p => {
    const s = saldos[p._fid + '_' + p.id];
    return s && p.emin > 0 && s.saldo > 0 && s.saldo < p.emin;
  });

  let ah = '';
  if(crit.length){
    ah += `<div class="alert al-r"><b>Estoque crÃ­tico:</b> ${crit.length} produto(s) zerado(s). ${crit.slice(0,3).map(p => p.nome).join(', ')}${crit.length > 3 ? 'â€¦' : ''}</div>`;
  }
  if(baixo.length){
    ah += `<div class="alert al-a"><b>Estoque em atenÃ§Ã£o:</b> ${baixo.length} item(ns) abaixo do mÃ­nimo. ${baixo.slice(0,3).map(p => p.nome).join(', ')}${baixo.length > 3 ? 'â€¦' : ''}</div>`;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + 7);

  const anivProximos = filIds
    .flatMap(fid => (D.clientes?.[fid] || []))
    .map(c => {
      const data = getProxAnivDate(c.data_aniversario, hoje);
      if(!data) return null;
      return { ...c, _anivData: data };
    })
    .filter(Boolean)
    .filter(c => c._anivData <= limite)
    .sort((a, b) => a._anivData - b._anivData);

  if(anivProximos.length){
    ah += `<div class="alert al-g"><b>AniversÃ¡rios prÃ³ximos:</b> ${anivProximos.length} cliente(s) nos prÃ³ximos 7 dias. ${anivProximos.slice(0,3).map(c => c.apelido || c.nome).join(', ')}${anivProximos.length > 3 ? 'â€¦' : ''}</div>`;
  }

  const filialJogosId = getFilialCalendarioId();
  const jogosAgenda = filialJogosId ? getJogosCache(filialJogosId) : [];
  const jogosSemana = jogosAgenda
    .filter(j => {
      const d = new Date(j.data_hora || 0);
      return !isNaN(d.getTime()) && d >= hoje && d <= limite && jogoEhDaSerie(j, serieSel);
    })
    .sort((a, b) => new Date(a.data_hora || 0) - new Date(b.data_hora || 0));

  const clientesBase = filIds.flatMap(fid => (D.clientes?.[fid] || []));
  const oportunidades = clientesBase
    .flatMap(c => {
      const times = parseTimes(c.time);
      if(!times.length) return [];
      return times.map(time => {
        const jogo = jogosSemana.find(j => jogoTemTime(j, time));
        if(!jogo) return null;
        return {
          cliente: c.nome,
          time,
          jogo,
          data: new Date(jogo.data_hora || 0)
        };
      });
    })
    .filter(Boolean)
    .sort((a, b) => a.data - b.data);

  const oportunidadesHoje = oportunidades.filter(o => {
    const d = new Date(o.data);
    if(isNaN(d.getTime())) return false;
    const fimHoje = new Date(hoje);
    fimHoje.setDate(fimHoje.getDate() + 1);
    return d >= hoje && d < fimHoje;
  });

  if(oportunidades.length){
    const serieTxt = serieSel === 'todas' ? 'todas as sÃ©ries' : `SÃ©rie ${serieSel.toUpperCase()}`;
    ah += `<div class="alert al-g"><b>Oportunidades por jogos:</b> ${oportunidades.length} cliente(s) elegÃ­vel(is) na semana (${serieTxt}). ${oportunidades.slice(0,3).map(o => `${o.cliente} (${o.time})`).join(', ')}${oportunidades.length > 3 ? 'â€¦' : ''}</div>`;
  }

  const alerts = document.getElementById('dash-alerts');
  if(alerts) alerts.innerHTML = ah;

  const chartEl = document.getElementById('dash-chart');
  const emEl = document.getElementById('dash-chart-empty');

  const grupos = {};
  entregues.forEach(p => {
    const d = new Date(p.data + 'T00:00:00');
    const k =
      State.dashP === 'ano'
        ? MES[d.getMonth()] + '/' + String(d.getFullYear()).slice(2)
        : p.data;

    if(!grupos[k]) grupos[k] = { fat: 0, lucro: 0 };
    grupos[k].fat += p.total || 0;
    grupos[k].lucro += (p.itens || []).reduce((a, i) => a + ((i.preco - i.custo) * i.qty), 0);
  });

  const gkeys = Object.keys(grupos).sort().slice(-10);

  if(chartEl && emEl){
    if(!gkeys.length){
      chartEl.style.display = 'none';
      emEl.style.display = 'block';
    } else {
      chartEl.style.display = 'flex';
      emEl.style.display = 'none';

      const mxF = Math.max(...gkeys.map(k => grupos[k].fat), 1);

      chartEl.innerHTML = gkeys.map(k => {
        const g = grupos[k];
        const hF = Math.round((g.fat / mxF) * 100);
        const hL = Math.round((Math.max(0, g.lucro) / mxF) * 100);
        const lbl = State.dashP === 'ano' ? k : k.split('-').slice(1).join('/');

        return `
          <div class="bc-col">
            <div class="bc-val">${fmtK(g.fat)}</div>
            <div style="display:flex;align-items:flex-end;gap:2px;flex:1;width:100%">
              <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end">
                <div class="bc-bar" style="height:${hF}%;background:#163F80;opacity:.82"></div>
              </div>
              <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end">
                <div class="bc-bar" style="height:${hL}%;background:#156038;opacity:.82"></div>
              </div>
            </div>
            <div class="bc-lbl">${lbl}</div>
          </div>
        `;
      }).join('');
    }
  }

  const stMap = { orcamento:0, confirmado:0, em_separacao:0, entregue:0, cancelado:0 };
  allPeds.forEach(p => {
    if(p.status in stMap) stMap[p.status]++;
  });

  const stLbl = {
    orcamento:'OrÃ§amento',
    confirmado:'Confirmado',
    em_separacao:'Em separaÃ§Ã£o',
    entregue:'Entregue',
    cancelado:'Cancelado'
  };

  const stCls = {
    orcamento:'bk',
    confirmado:'bb',
    em_separacao:'ba',
    entregue:'bg',
    cancelado:'br'
  };

  const tot = allPeds.length || 1;

  const dashStatus = document.getElementById('dash-status');
  if(dashStatus){
    dashStatus.innerHTML = Object.entries(stMap).map(([k, v]) => `
      <div class="rrow">
        <span class="bdg ${stCls[k]}">${stLbl[k]}</span>
        <div class="rbar"><div class="rbar-f" style="width:${Math.round((v / tot) * 100)}%;background:var(--bd2)"></div></div>
        <span style="font-size:13px;font-weight:600;min-width:20px;text-align:right">${v}</span>
      </div>
    `).join('');
  }

  const pq = {};
  entregues.forEach(p => {
    (p.itens || []).forEach(i => {
      if(!pq[i.nome]) pq[i.nome] = { fat: 0 };
      pq[i.nome].fat += i.qty * i.preco;
    });
  });

  const tp = Object.entries(pq).sort((a, b) => b[1].fat - a[1].fat).slice(0, 5);
  const mxP = tp.length ? tp[0][1].fat : 1;

  const dashTp = document.getElementById('dash-tp');
  if(dashTp){
    dashTp.innerHTML = tp.length
      ? tp.map(([n, d], i) => `
          <div class="rrow">
            <span class="rnum">${i + 1}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:${i === 0 ? 600 : 400}">${n}</span>
            <div class="rbar"><div class="rbar-f" style="width:${Math.round((d.fat / mxP) * 100)}%;background:#163F80"></div></div>
            <span class="rval">${fmtK(d.fat)}</span>
          </div>
        `).join('')
      : `<div class="empty" style="padding:12px"><p>Sem vendas</p></div>`;
  }

  const alertProds = allProds.filter(p => {
    const s = saldos[p._fid + '_' + p.id];
    return s && p.emin > 0 && s.saldo < p.emin;
  }).slice(0, 5);

  const dashEa = document.getElementById('dash-ea');
  if(dashEa){
    dashEa.innerHTML = alertProds.length
      ? alertProds.map(p => {
          const s = saldos[p._fid + '_' + p.id];
          return `
            <div class="rrow">
              <span style="width:8px;height:8px;border-radius:50%;background:${s.saldo <= 0 ? 'var(--r)' : 'var(--a)'};flex-shrink:0;display:inline-block"></span>
              <span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.nome}</span>
              <span class="bdg ${s.saldo <= 0 ? 'br' : 'ba'}" style="font-size:10px">${s.saldo <= 0 ? 'Zerado' : s.saldo}</span>
            </div>
          `;
        }).join('')
      : `<div class="empty" style="padding:12px"><p>âœ“ Sem alertas</p></div>`;
  }

  const fu = {};
  filIds.forEach(fid => {
    (D.cotConfig?.[fid]?.logs || []).forEach(l => {
      if(!fu[l.forn]) fu[l.forn] = 0;
      fu[l.forn]++;
    });
  });

  const tf = Object.entries(fu).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const mxF2 = tf.length ? tf[0][1] : 1;

  const dashForn = document.getElementById('dash-forn');
  if(dashForn){
    dashForn.innerHTML = tf.length
      ? tf.map(([n, c], i) => `
          <div class="rrow">
            <span class="rnum">${i + 1}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n}</span>
            <div class="rbar"><div class="rbar-f" style="width:${Math.round((c / mxF2) * 100)}%;background:#156038"></div></div>
            <span class="rval" style="color:var(--tx2)">${c}x</span>
          </div>
        `).join('')
      : `<div class="empty" style="padding:12px"><p>Nenhuma importaÃ§Ã£o</p></div>`;
  }

  const mp = {};
  entregues.forEach(p => {
    (p.itens || []).forEach(i => {
      if(!mp[i.nome]) mp[i.nome] = { fat: 0, lucro: 0, qty: 0 };
      mp[i.nome].fat += i.qty * i.preco;
      mp[i.nome].lucro += (i.preco - i.custo) * i.qty;
      mp[i.nome].qty += i.qty;
    });
  });

  const tmg = Object.entries(mp).sort((a, b) => b[1].fat - a[1].fat).slice(0, 8);

  const dashMargem = document.getElementById('dash-margem');
  if(dashMargem){
    dashMargem.innerHTML = tmg.length
      ? `
        <div class="tw">
          <table class="tbl">
            <thead>
              <tr>
                <th>Produto</th>
                <th style="text-align:right">Qtd</th>
                <th style="text-align:right">Faturamento</th>
                <th style="text-align:right">Lucro</th>
                <th style="text-align:right">Margem</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tmg.map(([n, d]) => {
                const mgv = d.fat > 0 ? (d.lucro / d.fat) * 100 : 0;
                return `
                  <tr>
                    <td style="font-weight:600">${n}</td>
                    <td style="text-align:right;color:var(--tx2)">${d.qty.toFixed(1)}</td>
                    <td style="text-align:right">${fmt(d.fat)}</td>
                    <td style="text-align:right;color:var(--g)">${fmt(d.lucro)}</td>
                    <td style="text-align:right;font-weight:600">${pct(mgv)}</td>
                    <td><span class="bdg ${mgv >= 20 ? 'bg' : mgv >= 10 ? 'ba' : 'br'}">${mgv >= 20 ? 'Boa' : mgv >= 10 ? 'Regular' : 'Baixa'}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `
      : `<div class="empty" style="padding:12px"><p>Sem vendas no perÃ­odo</p></div>`;
  }

  const dashOportunidades = document.getElementById('dash-oportunidades');
  if(dashOportunidades){
    const serieLabel = serieSel === 'todas' ? 'Todas as sÃ©ries' : `SÃ©rie ${serieSel.toUpperCase()}`;
    dashOportunidades.innerHTML = `
      <div class="rrow" style="margin-bottom:8px">
        <span class="bdg bk">${serieLabel}</span>
        <span class="bdg ${oportunidadesHoje.length ? 'bg' : 'bk'}">Hoje: ${oportunidadesHoje.length}</span>
        <span class="bdg ${oportunidades.length ? 'ba' : 'bk'}">Semana: ${oportunidades.length}</span>
      </div>
      <div class="dash-op-actions">
        <button class="btn btn-sm" data-click="ir('campanhas')">Abrir campanhas</button>
        <button class="btn btn-p btn-sm" data-click="abrirNovaCampanha()">Nova campanha</button>
      </div>
      ${oportunidades.length
      ? oportunidades.slice(0, 5).map(o => `
          <div class="rrow dash-op-item">
            <span style="width:8px;height:8px;border-radius:50%;background:var(--g);flex-shrink:0;display:inline-block"></span>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.cliente} â€¢ ${o.time}</div>
              <div style="font-size:11px;color:var(--tx3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.jogo.titulo || `${o.jogo.mandante || ''} x ${o.jogo.visitante || ''}`} â€¢ ${fmtDataHora(o.jogo.data_hora)}</div>
            </div>
            <button class="btn btn-sm" data-click="ir('campanhas')">Acionar</button>
          </div>
        `).join('')
      : `<div class="empty" style="padding:12px"><p>Sem oportunidades por jogos na semana</p></div>`}
    `;
  }
}

export function limparFormJogo(){
  const dataPadrao = new Date();
  dataPadrao.setHours(dataPadrao.getHours() + 2);
  const dataLocal = new Date(dataPadrao.getTime() - dataPadrao.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const t = document.getElementById('jogo-titulo');
  const c = document.getElementById('jogo-campeonato');
  const d = document.getElementById('jogo-data');
  const m = document.getElementById('jogo-mandante');
  const v = document.getElementById('jogo-visitante');
  const l = document.getElementById('jogo-local');

  if(t) t.value = '';
  if(c) c.value = '';
  if(d) d.value = dataLocal;
  if(m) m.value = '';
  if(v) v.value = '';
  if(l) l.value = '';
}

export function abrirNovoJogo(){
  limparFormJogo();
  abrirModal('modal-jogo');
}

export function abrirSyncJogos(){
  const urlInp = document.getElementById('jogo-api-url');
  const filtroInp = document.getElementById('jogo-api-time');
  if(urlInp){
    urlInp.value = localStorage.getItem(JOGOS_API_URL_KEY) || '';
  }
  if(filtroInp){
    filtroInp.value = localStorage.getItem(JOGOS_API_FILTRO_KEY) || '';
  }
  abrirModal('modal-jogo-sync');
}

export function usarExemploSyncJogos(apiUrl, filtro = ''){
  const urlInp = document.getElementById('jogo-api-url');
  const filtroInp = document.getElementById('jogo-api-time');
  if(urlInp) urlInp.value = apiUrl || '';
  if(filtroInp) filtroInp.value = filtro || '';
}

export async function sincronizarJogosDashboard(options = {}){
  const { apiUrl: forcedApiUrl = '', filtroTime: forcedFiltroTime = '', silent = false, auto = false } = options;
  const filialId = getFilialCalendarioId();
  if(!filialId){
    if(!silent) notify(MSG.jogos.missingFilial, SEVERITY.ERROR);
    return;
  }

  if(jogosSyncPromises.has(filialId)){
    return jogosSyncPromises.get(filialId);
  }

  const apiUrl = String(
    forcedApiUrl ||
    document.getElementById('jogo-api-url')?.value.trim() ||
    localStorage.getItem(JOGOS_API_URL_KEY) ||
    ''
  ).trim();
  const filtroTime = String(
    forcedFiltroTime ||
    document.getElementById('jogo-api-time')?.value ||
    localStorage.getItem(JOGOS_API_FILTRO_KEY) ||
    ''
  ).trim().toLowerCase();

  if(!apiUrl){
    if(!silent){
      notify(MSG.jogos.missingApiUrl, SEVERITY.WARNING);
      focusField('jogo-api-url', { markError: true });
    }
    return;
  }

  localStorage.setItem(JOGOS_API_URL_KEY, apiUrl);
  localStorage.setItem(JOGOS_API_FILTRO_KEY, filtroTime);

  const syncPromise = (async () => {
    let payload;
    try{
      payload = await SB.fetchJsonWithRetry(apiUrl);
    }catch(e){
      if(!silent) notify(MSG.jogos.fetchFailed(e?.message), SEVERITY.ERROR);
      return;
    }

    const lista = extrairListaJogos(payload);
    if(!lista.length){
      if(!silent) notify(MSG.jogos.emptyPayload, SEVERITY.WARNING);
      return;
    }

    const normalizados = lista
      .map(normalizeJogoExterno)
      .filter(Boolean)
      .filter(j => {
        if(!filtroTime) return true;
        return [j.titulo, j.mandante, j.visitante, j.campeonato]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(filtroTime);
      });

    if(!normalizados.length){
      if(!silent) notify(MSG.jogos.noEligible, SEVERITY.INFO);
      return;
    }

    let criados = 0;
    let erros = 0;
    const cache = getJogosCache(filialId);
    const byId = {};
    cache.forEach(j => {
      if(!isJogoExpirado(j)) byId[j.id] = j;
    });

    for(const j of normalizados){
      const id = j.extId ? `ext-${j.extId}` : stableJogoId(j);
      const item = {
        id,
        filial_id: filialId,
        titulo: j.titulo,
        campeonato: j.campeonato,
        data_hora: j.data_hora,
        mandante: j.mandante,
        visitante: j.visitante,
        local: j.local,
        status: j.status
      };

      try{
        await SB.upsertJogoAgenda(item);
        byId[id] = item;
        criados++;
      }catch(e){
        erros++;
        byId[id] = item;
        console.error('Falha ao upsert jogo externo', item, e);
      }
    }

    D.jogos[filialId] = sortJogosAgenda(Object.values(byId));
    await purgeExpiredJogos(filialId, { persist: true, silent: true });
    setJogosAutoSyncAt(filialId);

    if(!auto) fecharModal('modal-jogo-sync');
    renderDashJogos(document.getElementById('dash-fil')?.value || 'todas');
    if(!silent){
      notify(MSG.jogos.syncResult({ processados: normalizados.length, falhas: erros }), erros > 0 ? SEVERITY.WARNING : SEVERITY.SUCCESS);
    }
  })();

  jogosSyncPromises.set(filialId, syncPromise);
  try{
    await syncPromise;
  }finally{
    jogosSyncPromises.delete(filialId);
  }
}

async function ensureJogosAutoSync(fid){
  if(!fid || !shouldAutoSyncJogos(fid)) return;
  await sincronizarJogosDashboard({ silent: true, auto: true });
}

export async function salvarJogoDashboard(){
  const filialId = getFilialCalendarioId();
  if(!filialId){
    notify(MSG.jogos.missingFilial, SEVERITY.ERROR);
    return;
  }

  const titulo = document.getElementById('jogo-titulo')?.value.trim() || '';
  const campeonato = document.getElementById('jogo-campeonato')?.value.trim() || '';
  const data_hora = document.getElementById('jogo-data')?.value || '';
  const mandante = document.getElementById('jogo-mandante')?.value.trim() || '';
  const visitante = document.getElementById('jogo-visitante')?.value.trim() || '';
  const local = document.getElementById('jogo-local')?.value.trim() || '';

  if(!titulo || !data_hora){
    notify(MSG.jogos.invalidForm, SEVERITY.WARNING);
    if(!titulo) focusField('jogo-titulo', { markError: true });
    else focusField('jogo-data', { markError: true });
    return;
  }

  const item = {
    id: uid(),
    filial_id: filialId,
    titulo,
    campeonato: campeonato || null,
    data_hora,
    mandante: mandante || null,
    visitante: visitante || null,
    local: local || null,
    status: 'agendado'
  };

  try{
    await SB.upsertJogoAgenda(item);
  }catch(e){
    console.error('Erro ao salvar jogo na API', e);
    notify('Erro: jogo nÃ£o foi salvo no banco. AÃ§Ã£o: tente novamente.', SEVERITY.ERROR);
    return;
  }

  const jogos = getJogosCache(filialId);
  jogos.unshift(item);
  D.jogos[filialId] = sortJogosAgenda(jogos);

  fecharModal('modal-jogo');
  renderDashJogos(document.getElementById('dash-fil')?.value || 'todas');

  notify('Sucesso: jogo adicionado na agenda.', SEVERITY.SUCCESS);
}

export async function removerJogoDashboard(id){
  const filialId = getFilialCalendarioId();
  if(!filialId) return;
  if(!confirm('Remover este jogo da agenda?')) return;

  try{
    await SB.deleteJogoAgenda(id);
  }catch(e){
    console.error('Erro ao remover jogo da API', e);
    notify('Erro: nÃ£o foi possÃ­vel remover no banco. AÃ§Ã£o: tente novamente.', SEVERITY.ERROR);
    return;
  }

  D.jogos[filialId] = getJogosCache(filialId).filter(j => j.id !== id);
  renderDashJogos(document.getElementById('dash-fil')?.value || 'todas');
  notify('Sucesso: jogo removido da agenda.', SEVERITY.SUCCESS);
}

export function renderDashJogos(fsel = 'todas'){
  const el = document.getElementById('dash-jogos');
  if(!el) return;

  const filialId = getFilialCalendarioId();
  if(!filialId){
    el.innerHTML = `<div class="empty" style="padding:12px"><p>Sem filial para agenda.</p></div>`;
    return;
  }

  if(fsel !== 'todas' && fsel !== filialId){
    const nome = (D.filiais || []).find(f => f.id === filialId)?.nome || 'Filial 1';
    el.innerHTML = `<div class="empty" style="padding:12px"><p>Agenda disponÃ­vel em ${nome}.</p></div>`;
    return;
  }

  purgeExpiredJogos(filialId, { persist: true, silent: true }).catch(e => {
    console.error('Erro ao limpar jogos expirados da agenda', e);
  });
  ensureJogosAutoSync(filialId).catch(e => {
    console.error('Erro na sincronizacao automatica de jogos', e);
  });

  const agoraMs = Date.now();

  const jogos = getJogosCache(filialId)
    .filter(j => {
      const ts = getJogoDateMs(j);
      return ts != null && !isJogoExpirado(j, agoraMs);
    })
    .sort((a, b) => new Date(a.data_hora || 0) - new Date(b.data_hora || 0))
    .slice(0, 8);

  if(!jogos.length){
    el.innerHTML = `<div class="empty" style="padding:12px"><p>Sem jogos cadastrados.</p></div>`;
    return;
  }

  el.innerHTML = jogos.map(j => `
    <div class="rrow">
      <span style="width:8px;height:8px;border-radius:50%;background:var(--b);flex-shrink:0;display:inline-block"></span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${j.titulo}</div>
        <div style="font-size:11px;color:var(--tx3)">${fmtDataHora(j.data_hora)}${j.campeonato ? ' â€¢ ' + j.campeonato : ''}</div>
      </div>
      <button class="ib" title="Excluir jogo" data-click="removerJogoDashboard('${j.id}')">DEL</button>
    </div>
  `).join('');
}
