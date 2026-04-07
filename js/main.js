import { SB } from './api.js';
import { D, State, P, C, PD, FORNS, CPRECOS, CCFG } from './store.js';

import {
  toast,
  abrirModal,
  fecharModal,
  uid,
  norm,
  fmt,
  fmtN,
  fmtQ,
  mk2mg,
  prV
} from '../core/utils.js';

import {
  initCotacaoModule,
  renderFornSel,
  renderCotLogs,
  renderCotForns,
  renderCotTabela,
  salvarForn,
  remForn,
  cotLock,
  updPreco,
  cotFile,
  confirmarMapa,
  renderMapaBody
} from '../modules/cotacao.js';

import {
  initProdutosModule,
  renderProdMet,
  renderProdutos,
  limparFormProd,
  editarProd,
  syncV,
  syncA,
  calcProdPreview,
  salvarProduto,
  removerProd,
  refreshProdSel
} from '../modules/produtos.js';

import {
  renderCliMet,
  renderClientes,
  renderCliSegs,
  abrirCliDet,
  addNota,
  limparFormCli,
  editarCli,
  salvarCliente,
  removerCli,
  refreshCliDL
} from '../modules/clientes.js';

import {
  initPedidosModule,
  renderPedMet,
  renderPedidos,
  limparFormPed,
  editarPed,
  addItem,
  remItem,
  renderItens,
  salvarPedido,
  removerPed,
  verPed
} from '../modules/pedidos.js';

import {
  calcSaldos,
  calcSaldosMulti,
  atualizarBadgeEst,
  renderEstAlerts,
  renderEstPosicao,
  renderEstHist,
  refreshMovSel,
  refreshDestSel,
  resetMov,
  abrirMovProd,
  setTipo,
  movLoadProd,
  movCalc,
  movCalcAjuste,
  salvarMov,
  excluirMov
} from '../modules/estoque.js';

import {
  initDashboardModule,
  renderDashFilSel,
  renderDash,
  setP,
  renderDashJogos,
  abrirNovoJogo,
  limparFormJogo,
  salvarJogoDashboard,
  removerJogoDashboard,
  abrirSyncJogos,
  sincronizarJogosDashboard,
  usarExemploSyncJogos
} from '../modules/dashboard.js';

import {
  carregarCampanhas,
  carregarCampanhaEnvios,
  refreshCampanhasTela,
  limparFormCampanha,
  abrirNovaCampanha,
  adotarCampanhasParaFilialAtiva,
  editarCampanha,
  salvarCampanha,
  removerCampanha,
  renderCampanhasMet,
  renderCampanhas,
  gerarFilaCampanha,
  renderFilaWhatsApp,
  renderCampanhaEnvios,
  abrirWhatsAppEnvio,
  marcarEnvioEnviado,
  marcarEnvioFalhou
} from '../modules/campanhas.js';

const CORES = ['#163F80', '#156038', '#7A4E00', '#9B2D24', '#5B3F99', '#1A6B7A'];

function showLoading(on) {
  let el = document.getElementById('sb-loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sb-loading';
    el.style.cssText =
      'position:fixed;inset:0;background:rgba(246,245,242,.88);z-index:8000;display:none;align-items:center;justify-content:center;gap:12px;font-size:14px;font-weight:500;color:var(--tx2);font-family:DM Sans,sans-serif;backdrop-filter:blur(2px)';
    el.innerHTML =
      '<div style="width:22px;height:22px;border:2.5px solid var(--bd2);border-top-color:var(--acc);border-radius:50%;animation:sp .7s linear infinite"></div>Carregando dados…';
    const st = document.createElement('style');
    st.textContent = '@keyframes sp{to{transform:rotate(360deg)}}';
    document.head.appendChild(st);
    document.body.appendChild(el);
  }
  el.style.display = on ? 'flex' : 'none';
}

async function carregarDadosFilial(filId) {
  showLoading(true);
  try {
    const [
      prods,
      clis,
      peds,
      forns,
      precos,
      cfg,
      movs,
      jogos,
      campanhas,
      campanhaEnvios
    ] = await Promise.all([
      SB.getProdutos(filId),
      SB.getClientes(filId),
      SB.getPedidos(filId),
      SB.getFornecedores(filId),
      SB.getCotPrecos(filId),
      SB.getCotConfig(filId),
      SB.getMovs(filId),
      SB.getJogosAgenda(filId).catch(() => []),
      SB.getCampanhas(filId).catch(e => {
        console.error('Falha ao carregar campanhas na entrada da filial', e);
        toast('Não foi possível carregar campanhas do banco. Usando cache local.');
        return D.campanhas?.[filId] || [];
      }),
      SB.getCampanhaEnvios(filId).catch(e => {
        console.error('Falha ao carregar envios de campanhas na entrada da filial', e);
        toast('Não foi possível carregar envios de campanha do banco. Usando cache local.');
        return D.campanhaEnvios?.[filId] || [];
      })
    ]);

    D.produtos[filId] = prods || [];
    D.clientes[filId] = clis || [];
    D.pedidos[filId] = (peds || []).map(p => ({
      ...p,
      itens: typeof p.itens === 'string' ? JSON.parse(p.itens || '[]') : (p.itens || [])
    }));
    D.fornecedores[filId] = forns || [];

    if (!D.cotPrecos[filId]) D.cotPrecos[filId] = {};
    D.cotPrecos[filId] = {};
    (precos || []).forEach(p => {
      D.cotPrecos[filId][p.produto_id + '_' + p.fornecedor_id] = p.preco;
    });

    const logs = cfg?.logs
      ? (typeof cfg.logs === 'string' ? JSON.parse(cfg.logs) : cfg.logs)
      : [];

    D.cotConfig[filId] = {
      filial_id: filId,
      locked: cfg?.locked || false,
      logs
    };

    D.movs[filId] = movs || [];
    if (!D.jogos) D.jogos = {};
    D.jogos[filId] = jogos || [];

    if (!D.campanhas) D.campanhas = {};
    if (!D.campanhaEnvios) D.campanhaEnvios = {};
    D.campanhas[filId] = campanhas || [];
    D.campanhaEnvios[filId] = campanhaEnvios || [];
  } catch (e) {
    toast('Erro ao carregar: ' + e.message);
    console.error(e);
  }
  showLoading(false);
}

function mostrarTela(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  document.getElementById(id)?.classList.add('on');
  window.scrollTo(0, 0);
}

function renderSetupGrid() {
  const grid = document.getElementById('fil-grid');
  const form = document.getElementById('setup-form');
  const actions = document.getElementById('setup-actions');
  const sub = document.getElementById('setup-sub');

  if (!grid || !form || !actions || !sub) return;

  if (!D.filiais.length) {
    grid.innerHTML = '';
    form.style.display = 'block';
    actions.style.display = 'none';
    sub.textContent = 'Crie sua primeira filial para começar';
    return;
  }

  form.style.display = 'none';
  actions.style.display = 'flex';
  sub.textContent = 'Selecione a filial para continuar';

  grid.innerHTML = D.filiais.map(f => `
    <div class="fil-opt ${State.selFil === f.id ? 'sel' : ''}" onclick="selFilial('${f.id}')">
      <div class="fil-dot" style="background:${f.cor}"></div>
      <div>
        <div class="fil-name">${f.nome}</div>
        <div class="fil-city">${f.cidade || ''}${f.estado ? ' - ' + f.estado : ''}</div>
      </div>
    </div>
  `).join('');
}

async function renderSetup() {
  mostrarTela('screen-setup');
  showLoading(true);
  try {
    D.filiais = await SB.getFiliais() || [];
  } catch (e) {
    toast('Erro ao buscar filiais: ' + e.message);
  }
  showLoading(false);
  renderSetupGrid();
}

function selFilial(id) {
  State.selFil = id;
  renderSetupGrid();
}

async function criarPrimeiraFilial() {
  const nome = document.getElementById('sf-nome')?.value.trim();
  if (!nome) {
    toast('Informe o nome da filial.');
    return;
  }

  const f = {
    id: uid(),
    nome,
    cidade: document.getElementById('sf-cidade')?.value.trim() || '',
    estado: document.getElementById('sf-estado')?.value.trim() || '',
    cor: document.getElementById('sf-cor')?.value || CORES[0],
    endereco: ''
  };

  try {
    await SB.upsertFilial(f);
  } catch (e) {
    toast('Erro ao criar filial: ' + e.message);
    return;
  }

  D.filiais.push(f);
  State.selFil = f.id;
  await entrar();
}

async function entrar() {
  if (!State.selFil) {
    toast('Selecione uma filial.');
    return;
  }

  try {
    D.filiais = await SB.getFiliais() || [];
  } catch (e) {}

  const f = D.filiais.find(x => x.id === State.selFil);
  if (!f) {
    toast('Filial não encontrada.');
    return;
  }

  State.FIL = State.selFil;

  const dot = document.getElementById('sb-dot');
  const fname = document.getElementById('sb-fname');
  if (dot) dot.style.background = f.cor;
  if (fname) fname.textContent = f.nome;

  await carregarDadosFilial(State.FIL);

  mostrarTela('screen-app');

  refreshProdSel();
  refreshCliDL();
  renderFornSel();
  refreshMovSel();
  refreshDestSel();
  renderDashFilSel();
  renderDash();
  atualizarBadgeEst();

  ir('dashboard');
}

function voltarSetup() {
  renderSetup();
}

function ir(p) {
  fecharSb();

  document.querySelectorAll('.ni').forEach(n => n.classList.toggle('on', n.dataset.p === p));
  document.querySelectorAll('.pg').forEach(x => x.classList.remove('on'));
  document.getElementById('pg-' + p)?.classList.add('on');
  document.querySelectorAll('.mob-btn').forEach(b => b.classList.toggle('on', b.id === 'mob-' + p));

  const renderMap = {
    dashboard: renderDash,
    produtos: () => { renderProdMet(); renderProdutos(); },
    clientes: () => { renderCliMet(); renderClientes(); },
    pedidos: () => { renderPedMet(); renderPedidos(); },
    cotacao: () => { renderFornSel(); renderCotForns(); renderCotLogs(); renderCotTabela(); },
    estoque: () => { renderEstAlerts(); renderEstPosicao(); renderEstHist(); },
    campanhas: () => { renderCampanhasMet(); renderCampanhas(); renderFilaWhatsApp(); renderCampanhaEnvios(); },
    filiais: () => { renderFilMet(); renderFilLista(); }
  };

  if (renderMap[p]) renderMap[p]();
  window.scrollTo(0, 0);
}

function switchTab(grp, name) {
  const prefix = grp + '-tc-';
  document.querySelectorAll(`[id^="${prefix}"]`).forEach(t => t.classList.remove('on'));
  document.getElementById(prefix + name)?.classList.add('on');

  document.querySelectorAll(`#pg-${grp} .tb`).forEach((b, i) => {
    const ids = Array.from(document.querySelectorAll(`[id^="${prefix}"]`)).map(t => t.id.replace(prefix, ''));
    b.classList.toggle('on', ids[i] === name);
  });
}

function abrirSb() {
  document.getElementById('sb')?.classList.add('on');
  document.getElementById('sb-overlay')?.classList.add('on');
  const close = document.getElementById('sb-close');
  if (close) close.style.display = 'flex';
}

function fecharSb() {
  document.getElementById('sb')?.classList.remove('on');
  document.getElementById('sb-overlay')?.classList.remove('on');
  const close = document.getElementById('sb-close');
  if (close) close.style.display = 'none';
}

function limparFormFilial() {
  State.editIds.filial = null;
  document.getElementById('filial-modal-titulo').textContent = 'Nova filial';
  ['fil-nome', 'fil-cidade', 'fil-estado', 'fil-end'].forEach(i => {
    const el = document.getElementById(i);
    if (el) el.value = '';
  });
  document.getElementById('fil-cor').value = CORES[D.filiais.length % CORES.length];
}

function editarFilial(id) {
  const f = D.filiais.find(x => x.id === id);
  if (!f) return;

  State.editIds.filial = id;
  document.getElementById('filial-modal-titulo').textContent = 'Editar filial';
  document.getElementById('fil-nome').value = f.nome;
  document.getElementById('fil-cidade').value = f.cidade || '';
  document.getElementById('fil-estado').value = f.estado || '';
  document.getElementById('fil-end').value = f.endereco || '';
  document.getElementById('fil-cor').value = f.cor;
  abrirModal('modal-filial');
}

async function salvarFilial() {
  const nome = document.getElementById('fil-nome')?.value.trim();
  if (!nome) {
    toast('Informe o nome.');
    return;
  }

  const f = {
    id: State.editIds.filial || uid(),
    nome,
    cidade: document.getElementById('fil-cidade')?.value.trim() || '',
    estado: document.getElementById('fil-estado')?.value.trim() || '',
    endereco: document.getElementById('fil-end')?.value.trim() || '',
    cor: document.getElementById('fil-cor')?.value || CORES[0]
  };

  try {
    await SB.upsertFilial(f);
  } catch (e) {
    toast('Erro: ' + e.message);
    return;
  }

  fecharModal('modal-filial');
  await renderSetup();
  renderFilLista();
  renderFilMet();
  renderDashFilSel();

  toast(State.editIds.filial ? 'Filial atualizada!' : 'Filial criada!');
}

async function removerFilial(id) {
  if (!confirm('Remover filial e dados?')) return;

  try {
    await SB.deleteFilial(id);
  } catch (e) {
    toast('Erro: ' + e.message);
    return;
  }

  D.filiais = D.filiais.filter(f => f.id !== id);
  renderFilLista();
  renderFilMet();
  await renderSetup();
  renderDashFilSel();
  toast('Filial removida.');
}

function renderFilMet() {
  const el = document.getElementById('fil-met');
  if (!el) return;

  el.innerHTML = `
    <div class="met"><div class="ml">Filiais</div><div class="mv">${D.filiais.length}</div></div>
    <div class="met"><div class="ml">Total produtos</div><div class="mv">${Object.values(D.produtos).flat().length}</div></div>
    <div class="met"><div class="ml">Total pedidos</div><div class="mv">${Object.values(D.pedidos).flat().length}</div></div>
  `;
}

function renderFilLista() {
  const el = document.getElementById('fil-lista');
  if (!el) return;

  if (!D.filiais.length) {
    el.innerHTML = `<div class="empty"><div class="ico">🏢</div><p>Nenhuma filial cadastrada.</p></div>`;
    return;
  }

  el.innerHTML = D.filiais.map(f => {
    const prods = (D.produtos[f.id] || []).length;
    const clis = (D.clientes[f.id] || []).length;
    const peds = (D.pedidos[f.id] || []).length;
    const ativa = f.id === State.FIL;

    return `
      <div class="card fb" style="${ativa ? 'border-color:var(--acc)' : ''}">
        <div style="display:flex;align-items:center;gap:12px;flex:1">
          <div style="width:14px;height:14px;border-radius:50%;background:${f.cor};flex-shrink:0"></div>
          <div>
            <div style="font-weight:600;font-size:15px">
              ${f.nome}${ativa ? ` <span class="bdg bb" style="font-size:10px;vertical-align:middle">Ativa</span>` : ''}
            </div>
            <div style="font-size:12px;color:var(--tx3)">${f.cidade || ''}${f.estado ? ' - ' + f.estado : ''}</div>
            <div style="display:flex;gap:6px;margin-top:6px">
              <span class="bdg bk">${prods} produto(s)</span>
              <span class="bdg bk">${clis} cliente(s)</span>
              <span class="bdg bk">${peds} pedido(s)</span>
            </div>
          </div>
        </div>
        <div class="fg2">
          ${!ativa ? `<button class="btn btn-sm" onclick="trocarFilial('${f.id}')">Selecionar</button>` : ''}
          <button class="ib" onclick="editarFilial('${f.id}')">✏</button>
          <button class="ib" onclick="removerFilial('${f.id}')">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

async function trocarFilial(id) {
  State.selFil = id;
  await entrar();
  await renderSetup();
  toast('Filial alterada!');
}

function exportCSV(tipo) {
  const saldos = calcSaldos();
  let rows = [];
  let name = '';

  if (tipo === 'produtos') {
    name = 'produtos';
    rows = [
      ['Nome', 'SKU', 'Un', 'Categoria', 'Custo', 'Mk Varejo%', 'Mg Varejo%', 'Preço Varejo', 'Mk Atacado%', 'Preço Atacado', 'Est. Min', 'Saldo Atual'],
      ...P().map(p => {
        const pv = prV(p.custo, p.mkv);
        const pa = p.pfa > 0 ? p.pfa : (p.mka > 0 ? prV(p.custo, p.mka) : 0);
        const s = saldos[p.id] || { saldo: 0 };
        return [p.nome, p.sku || '', p.un, p.cat || '', fmtN(p.custo), fmtN(p.mkv), fmtN(mk2mg(p.mkv)), fmtN(pv), fmtN(p.mka), pa > 0 ? fmtN(pa) : '', p.emin || '', fmtN(s.saldo)];
      })
    ];
  } else if (tipo === 'clientes') {
    name = 'clientes';
    rows = [
      ['Nome', 'Apelido', 'CPF/CNPJ', 'Tipo', 'Status', 'Telefone', 'Email', 'Time', 'Segmento', 'Tabela', 'Prazo', 'Cidade', 'WhatsApp', 'Aniversário'],
      ...C().map(c => [c.nome, c.apelido || '', c.doc || '', c.tipo, c.status, c.tel || '', c.email || '', c.time || '', c.seg || '', c.tab, c.prazo, c.cidade || '', c.whatsapp || '', c.data_aniversario || ''])
    ];
  } else if (tipo === 'pedidos') {
    name = 'pedidos';
    rows = [
      ['Nº', 'Cliente', 'Data', 'Status', 'Tipo', 'Pagamento', 'Prazo', 'Total', 'Lucro', 'Obs'],
      ...PD().map(p => {
        const lucro = (p.itens || []).reduce((a, i) => a + ((i.preco - i.custo) * i.qty), 0);
        return [p.num, p.cli, p.data, p.status, p.tipo, p.pgto, p.prazo, fmtN(p.total), fmtN(lucro), p.obs || ''];
      })
    ];
  } else if (tipo === 'cotacao') {
    name = 'cotacao';
    const forns = FORNS();
    if (!P().length || !forns.length) {
      toast('Sem dados para exportar.');
      return;
    }

    rows = [
      ['Produto', 'Un', ...forns.map(f => f.nome), 'Melhor preço', 'Melhor fornecedor'],
      ...P().map(p => {
        const prices = forns.map(f => {
          const k = p.id + '_' + f.id;
          return CPRECOS()[k] !== undefined ? parseFloat(CPRECOS()[k]) : '';
        });
        const valid = prices.filter(v => v !== '' && v > 0);
        const mp = valid.length ? Math.min(...valid) : '';
        const bi = prices.findIndex(v => v === mp);
        return [p.nome, p.un, ...prices, mp !== '' ? fmtN(mp) : '', bi >= 0 ? forns[bi].nome : ''];
      })
    ];
  } else if (tipo === 'estoque') {
    name = 'estoque';
    rows = [
      ['Produto', 'SKU', 'Un', 'Saldo', 'Custo Médio', 'Valor Total', 'Est. Mín', 'Status'],
      ...P().map(p => {
        const s = saldos[p.id] || { saldo: 0, cm: 0 };
        const min = p.emin || 0;
        const st = s.saldo <= 0 ? 'Zerado' : min > 0 && s.saldo < min ? 'Baixo' : 'OK';
        return [p.nome, p.sku || '', p.un, fmtN(s.saldo), fmtN(s.cm), fmtN(s.saldo * s.cm), min || '', st];
      })
    ];
  } else if (tipo === 'campanhas') {
    name = 'campanhas';
    const campanhas = (D.campanhas?.[State.FIL] || []);
    rows = [
      ['Nome', 'Tipo', 'Canal', 'Antecedência', 'Assunto', 'Cupom', 'Desconto', 'Ativo'],
      ...campanhas.map(c => [c.nome, c.tipo, c.canal, c.dias_antecedencia || 0, c.assunto || '', c.cupom || '', c.desconto || 0, c.ativo ? 'Sim' : 'Não'])
    ];
  }

  if (!rows.length) {
    toast('Sem dados para exportar.');
    return;
  }

  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name + '.csv';
  a.click();
  toast('CSV exportado!');
}

function exportarTudo() {
  ['produtos', 'clientes', 'pedidos', 'cotacao', 'estoque', 'campanhas'].forEach((t, i) =>
    setTimeout(() => exportCSV(t), i * 200)
  );
}

initCotacaoModule({
  renderCotLogs,
  renderProdMet,
  renderProdutos
});

initProdutosModule({
  calcSaldos
});

initPedidosModule({
  refreshProdSel,
  refreshCliDL
});

initDashboardModule({
  calcSaldosMulti
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    renderSetup();
  });
} else {
  renderSetup();
}

window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.criarPrimeiraFilial = criarPrimeiraFilial;
window.entrar = entrar;
window.voltarSetup = voltarSetup;
window.selFilial = selFilial;
window.fecharSb = fecharSb;
window.abrirSb = abrirSb;
window.ir = ir;
window.switchTab = switchTab;
window.exportarTudo = exportarTudo;
window.exportCSV = exportCSV;

window.renderDashFilSel = renderDashFilSel;
window.renderDash = renderDash;
window.setP = setP;
window.renderDashJogos = renderDashJogos;
window.abrirNovoJogo = abrirNovoJogo;
window.limparFormJogo = limparFormJogo;
window.salvarJogoDashboard = salvarJogoDashboard;
window.removerJogoDashboard = removerJogoDashboard;
window.abrirSyncJogos = abrirSyncJogos;
window.sincronizarJogosDashboard = sincronizarJogosDashboard;
window.usarExemploSyncJogos = usarExemploSyncJogos;

window.renderProdutos = renderProdutos;
window.renderProdMet = renderProdMet;
window.limparFormProd = limparFormProd;
window.salvarProduto = salvarProduto;
window.editarProd = editarProd;
window.removerProd = removerProd;
window.calcProdPreview = calcProdPreview;
window.syncV = syncV;
window.syncA = syncA;
window.refreshProdSel = refreshProdSel;

window.renderClientes = renderClientes;
window.renderCliMet = renderCliMet;
window.limparFormCli = limparFormCli;
window.salvarCliente = salvarCliente;
window.editarCli = editarCli;
window.removerCli = removerCli;
window.renderCliSegs = renderCliSegs;
window.abrirCliDet = abrirCliDet;
window.addNota = addNota;
window.refreshCliDL = refreshCliDL;

window.renderPedidos = renderPedidos;
window.renderPedMet = renderPedMet;
window.limparFormPed = limparFormPed;
window.salvarPedido = salvarPedido;
window.editarPed = editarPed;
window.removerPed = removerPed;
window.verPed = verPed;
window.addItem = addItem;
window.remItem = remItem;
window.renderItens = renderItens;

window.renderCotForns = renderCotForns;
window.renderCotTabela = renderCotTabela;
window.cotFile = cotFile;
window.cotLock = cotLock;
window.salvarForn = salvarForn;
window.remForn = remForn;
window.confirmarMapa = confirmarMapa;
window.renderMapaBody = renderMapaBody;
window.renderFornSel = renderFornSel;
window.renderCotLogs = renderCotLogs;
window.updPreco = updPreco;

window.renderEstPosicao = renderEstPosicao;
window.renderEstHist = renderEstHist;
window.renderEstAlerts = renderEstAlerts;
window.atualizarBadgeEst = atualizarBadgeEst;
window.resetMov = resetMov;
window.abrirMovProd = abrirMovProd;
window.setTipo = setTipo;
window.movLoadProd = movLoadProd;
window.movCalc = movCalc;
window.movCalcAjuste = movCalcAjuste;
window.salvarMov = salvarMov;
window.excluirMov = excluirMov;
window.refreshMovSel = refreshMovSel;
window.refreshDestSel = refreshDestSel;

window.salvarFilial = salvarFilial;
window.limparFormFilial = limparFormFilial;
window.editarFilial = editarFilial;
window.removerFilial = removerFilial;
window.trocarFilial = trocarFilial;
window.renderFilMet = renderFilMet;
window.renderFilLista = renderFilLista;

window.carregarCampanhas = carregarCampanhas;
window.carregarCampanhaEnvios = carregarCampanhaEnvios;
window.refreshCampanhasTela = refreshCampanhasTela;
window.limparFormCampanha = limparFormCampanha;
window.abrirNovaCampanha = abrirNovaCampanha;
window.adotarCampanhasParaFilialAtiva = adotarCampanhasParaFilialAtiva;
window.editarCampanha = editarCampanha;
window.salvarCampanha = salvarCampanha;
window.removerCampanha = removerCampanha;
window.renderCampanhasMet = renderCampanhasMet;
window.renderCampanhas = renderCampanhas;
window.gerarFilaCampanha = gerarFilaCampanha;
window.renderFilaWhatsApp = renderFilaWhatsApp;
window.renderCampanhaEnvios = renderCampanhaEnvios;
window.abrirWhatsAppEnvio = abrirWhatsAppEnvio;
window.marcarEnvioEnviado = marcarEnvioEnviado;
window.marcarEnvioFalhou = marcarEnvioFalhou;
