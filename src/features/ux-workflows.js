// @ts-check

/** @typedef {import('../types/domain').UxWorkflowsModuleDeps} UxWorkflowsModuleDeps */

import { forceClientesReactMode, isClientesReactFeatureEnabled } from './clientes-react-bridge.js';
import { toast, norm, fmt, prV } from '../shared/utils.js';

/** @type {UxWorkflowsModuleDeps} */
let deps = {
  ir: () => {},
  limparFormPedTracked: () => {},
  limparFormCliTracked: () => {},
  limparFormProdTracked: () => {},
  isClientesReactPilotActive: () => false,
  abrirNovoClienteReact: () => {},
  abrirNovaCampanhaTracked: () => {},
  abrirModal: () => {},
  resetMov: () => {},
  abrirSyncJogos: () => {}
};

const FLOW_MAX = { prod: 4, cli: 4 };
const flowSteps = { prod: 1, cli: 1 };

export function initUxWorkflowsModule(nextDeps = {}) {
  deps = { ...deps, ...nextDeps };
}

export function getFlowStep(flow) {
  return flowSteps[flow] || 1;
}

export function executarAuditoriaVisual() {
  const checks = [];
  const add = (ok, item, detalhe = '') => checks.push({ ok, item, detalhe });
  const has = (id) => !!document.getElementById(id);
  add(has('app-title') && has('app-sub') && has('app-act-primary'), 'Topbar global');
  add(
    has('pg-clientes') &&
      (has('cli-react-root') || has('cli-lista')) &&
      (has('cli-react-shell') || has('modal-cliente')),
    'Fluxo Clientes'
  );
  add(
    has('pg-campanhas') && has('camp-lista') && has('camp-wa-fila') && has('modal-campanha'),
    'Fluxo Campanhas'
  );
  const btnPrimario = document.getElementById('app-act-primary');
  add(!!String(btnPrimario?.textContent || '').trim(), 'CTA primario com rotulo');
  const falhas = checks.filter((c) => !c.ok);
  const ok = checks.length - falhas.length;
  console.table(
    checks.map((c) => ({ status: c.ok ? 'OK' : 'FALHA', item: c.item, detalhe: c.detalhe || '' }))
  );
  toast(
    falhas.length
      ? `Auditoria visual: ${ok}/${checks.length} OK (${falhas.length} falha(s)).`
      : `Auditoria visual: ${ok}/${checks.length} OK.`
  );
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function executarAuditoriaAceite() {
  const checks = [];
  const add = (frente, ok, item, detalhe = '') => checks.push({ frente, ok, item, detalhe });
  const btn = document.querySelector('.btn');
  const card = document.querySelector('.card');
  const panel = document.querySelector('.panel');
  const radiusMd = cssVar('--radius-md');
  const radiusLg = cssVar('--radius-lg');
  const shadowMd = cssVar('--shadow-md');
  add(
    'Consistencia visual',
    !!radiusMd && !!radiusLg && !!shadowMd,
    'Tokens base de radius/sombra'
  );
  if (btn) {
    const s = getComputedStyle(btn);
    add(
      'Consistencia visual',
      s.borderRadius === radiusMd,
      'Botao usa radius padronizado',
      `button radius: ${s.borderRadius}`
    );
  }
  if (card && panel) {
    const sc = getComputedStyle(card);
    const sp = getComputedStyle(panel);
    add(
      'Consistencia visual',
      sc.borderRadius === sp.borderRadius,
      'Card e Panel com raio consistente',
      `card:${sc.borderRadius} panel:${sp.borderRadius}`
    );
  }
  const total = checks.length;
  const ok = checks.filter((c) => c.ok).length;
  const falhas = checks.filter((c) => !c.ok);
  console.table(
    checks.map((c) => ({
      frente: c.frente,
      status: c.ok ? 'OK' : 'FALHA',
      item: c.item,
      detalhe: c.detalhe || ''
    }))
  );
  toast(
    falhas.length
      ? `Aceite por frente: ${ok}/${total} OK (${falhas.length} pendencia(s)).`
      : `Aceite por frente: ${ok}/${total} OK.`
  );
}

function getQuickCommands() {
  return [
    { cmd: '/ dashboard', label: 'Abrir Dashboard', run: () => deps.ir?.('dashboard') },
    { cmd: '/ gerencial', label: 'Abrir Gerencial', run: () => deps.ir?.('gerencial') },
    { cmd: '/ produtos', label: 'Abrir Produtos', run: () => deps.ir?.('produtos') },
    { cmd: '/ clientes', label: 'Abrir Clientes', run: () => deps.ir?.('clientes') },
    { cmd: '/ pedidos', label: 'Abrir Pedidos', run: () => deps.ir?.('pedidos') },
    { cmd: '/ cotacao', label: 'Abrir Cotação', run: () => deps.ir?.('cotacao') },
    { cmd: '/ estoque', label: 'Abrir Estoque', run: () => deps.ir?.('estoque') },
    { cmd: '/ campanhas', label: 'Abrir Campanhas', run: () => deps.ir?.('campanhas') },
    { cmd: '/ acessos', label: 'Abrir Acessos', run: () => deps.ir?.('acessos') },
    { cmd: '/ notificacoes', label: 'Abrir Notificações', run: () => deps.ir?.('notificacoes') },
    { cmd: '/ filiais', label: 'Abrir Filiais', run: () => deps.ir?.('filiais') },
    {
      cmd: '/ novo pedido',
      label: 'Novo Pedido',
      run: () => {
        deps.limparFormPedTracked?.();
        deps.abrirModal?.('modal-pedido');
      }
    },
    {
      cmd: '/ novo cliente',
      label: 'Novo Cliente',
      run: () => {
        if (isClientesReactFeatureEnabled()) {
          forceClientesReactMode();
          deps.abrirNovoClienteReact?.();
          return;
        }
        deps.limparFormCliTracked?.();
        deps.abrirModal?.('modal-cliente');
      }
    },
    {
      cmd: '/ novo produto',
      label: 'Novo Produto',
      run: () => {
        deps.limparFormProdTracked?.();
        deps.abrirModal?.('modal-produto');
      }
    },
    {
      cmd: '/ nova campanha',
      label: 'Nova Campanha',
      run: () => deps.abrirNovaCampanhaTracked?.()
    },
    {
      cmd: '/ nova mov',
      label: 'Nova Movimentação',
      run: () => {
        deps.resetMov?.();
        deps.abrirModal?.('modal-mov');
      }
    },
    { cmd: '/ sync jogos', label: 'Sincronizar Jogos', run: () => deps.abrirSyncJogos?.() },
    { cmd: '/ auditoria visual', label: 'Auditoria Visual', run: () => executarAuditoriaVisual() },
    {
      cmd: '/ auditoria aceite',
      label: 'Auditoria de Aceite',
      run: () => executarAuditoriaAceite()
    }
  ];
}

export function initQuickCommand() {
  const input = document.getElementById('quick-cmd');
  const dl = document.getElementById('quick-cmd-list');
  if (!input || !dl) return;
  const quickCommands = getQuickCommands();
  dl.innerHTML = quickCommands.map((c) => `<option value="${c.cmd}">${c.label}</option>`).join('');

  if (!input.dataset.boundQuick) {
    input.dataset.boundQuick = '1';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        input.blur();
        input.value = '';
        return;
      }
      if (e.key !== 'Enter') return;
      const ok = executeQuickCommand(input.value);
      if (ok) {
        input.value = '';
        input.blur();
      }
    });
  }

  if (!document.body.dataset.boundQuickGlobal) {
    document.body.dataset.boundQuickGlobal = '1';
    document.addEventListener('keydown', (e) => {
      if (e.key !== '/') return;
      const target = /** @type {HTMLElement | null} */ (
        e.target instanceof HTMLElement ? e.target : null
      );
      const editing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (editing) return;
      e.preventDefault();
      input.focus();
      input.select();
    });
  }
}

function findQuickCommand(raw) {
  const quickCommands = getQuickCommands();
  const v = norm(raw).replace(/^\/\s*/, '');
  if (!v) return null;
  return (
    quickCommands.find((c) => norm(c.cmd).replace(/^\/\s*/, '') === v) ||
    quickCommands.find((c) =>
      norm(c.cmd)
        .replace(/^\/\s*/, '')
        .includes(v)
    )
  );
}

function executeQuickCommand(raw) {
  const found = findQuickCommand(raw);
  if (!found) {
    toast('Comando nao encontrado. Ex: / clientes, / nova campanha');
    return false;
  }
  found.run();
  return true;
}

function flowVal(id, fallback = '—') {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const raw = ('value' in el ? el.value : el.textContent) ?? '';
  const v = String(raw).trim();
  return v || String(fallback);
}

function focusField(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus();
  if (typeof el.select === 'function') el.select();
}

function validateFlowStep(flow, step) {
  if (flow === 'prod') {
    if (step === 1) {
      const nome = flowVal('p-nome', '');
      const custo = parseFloat(String(document.getElementById('p-custo')?.value || 0)) || 0;
      if (!nome) {
        toast('Produto: informe o nome para continuar.');
        focusField('p-nome');
        return false;
      }
      if (custo <= 0) {
        toast('Produto: informe um custo maior que zero.');
        focusField('p-custo');
        return false;
      }
    }
    if (step === 2) {
      const pvv = parseFloat(String(document.getElementById('p-pvv')?.value || 0)) || 0;
      const mkv = parseFloat(String(document.getElementById('p-mkv')?.value || 0)) || 0;
      const pfa = parseFloat(String(document.getElementById('p-pfa')?.value || 0)) || 0;
      const mka = parseFloat(String(document.getElementById('p-mka')?.value || 0)) || 0;
      if (pvv <= 0 && mkv <= 0 && pfa <= 0 && mka <= 0) {
        toast('Produto: defina preco ou markup de varejo, ou preco/markup de atacado.');
        focusField('p-pvv');
        return false;
      }
    }
    return true;
  }

  if (flow === 'cli') {
    if (step === 1) {
      const nome = flowVal('c-nome', '');
      if (!nome) {
        toast('Cliente: informe o nome para continuar.');
        focusField('c-nome');
        return false;
      }
    }
    if (step === 2) {
      const tab = flowVal('c-tab', '');
      const prazo = flowVal('c-prazo', '');
      if (!tab || !prazo) {
        toast('Cliente: complete os dados comerciais (tabela e prazo).');
        focusField(!tab ? 'c-tab' : 'c-prazo');
        return false;
      }
    }
    return true;
  }

  return true;
}

function renderFlowSummary(flow) {
  if (flow === 'prod') {
    const el = document.getElementById('prod-flow-resumo');
    if (!el) return;
    const custo = parseFloat(String(document.getElementById('p-custo')?.value || 0)) || 0;
    const pvv = parseFloat(String(document.getElementById('p-pvv')?.value || 0)) || 0;
    const mkv = parseFloat(String(document.getElementById('p-mkv')?.value || 0)) || 0;
    const mka = parseFloat(String(document.getElementById('p-mka')?.value || 0)) || 0;
    const pfa = parseFloat(String(document.getElementById('p-pfa')?.value || 0)) || 0;
    const un = flowVal('p-un', '');
    const nome = flowVal('p-nome', '');
    const sku = flowVal('p-sku', '—');
    const cat = flowVal('p-cat', '—');
    const pv = pvv > 0 ? pvv : custo > 0 && mkv > 0 ? prV(custo, mkv) : 0;
    const pa = pfa > 0 ? pfa : custo > 0 && mka > 0 ? prV(custo, mka) : 0;
    const margemV = pv > 0 ? ((pv - custo) / pv) * 100 : 0;
    const margemA = pa > 0 ? ((pa - custo) / pa) * 100 : 0;
    const inconsistencias = [];
    if (pv > 0 && pv <= custo) inconsistencias.push('Preco varejo esta menor/igual ao custo.');
    if (pa > 0 && pa <= custo) inconsistencias.push('Preco atacado esta menor/igual ao custo.');
    if (pa > 0 && pv > 0 && pa > pv) inconsistencias.push('Preco atacado esta acima do varejo.');
    if ((parseFloat(String(document.getElementById('p-emin')?.value || 0)) || 0) < 0)
      inconsistencias.push('Estoque minimo negativo.');
    const checks = [
      { ok: !!nome, label: 'Nome do produto' },
      { ok: !!un, label: 'Unidade' },
      { ok: custo > 0, label: 'Custo valido' },
      { ok: pvv > 0 || mkv > 0 || mka > 0 || pfa > 0, label: 'Regra de preco definida' }
    ];
    const checkHtml = checks
      .map(
        (c) =>
          `<span class="bdg ${c.ok ? 'bg' : 'br'}">${c.ok ? 'OK' : 'Pendente'} • ${c.label}</span>`
      )
      .join('');
    const incHtml = inconsistencias.length
      ? `<div class="panel form-gap-top-xs"><div class="pt">Inconsistencias</div>${inconsistencias.map((i) => `<div class="detail-line">- ${i}</div>`).join('')}</div>`
      : `<div class="panel form-gap-top-xs"><div class="pt">Inconsistencias</div><div>Nenhuma inconsistência critica detectada.</div></div>`;
    el.innerHTML = `
      <div class="fg2 form-gap-bottom-xs gap-6">${checkHtml}</div>
      <div class="fg c2"><div><div class="fl">Produto</div><div><b>${nome || '—'}</b></div></div><div><div class="fl">SKU</div><div>${sku}</div></div></div>
      <div class="fg c2"><div><div class="fl">Unidade / Categoria</div><div>${un || '—'} • ${cat}</div></div><div><div class="fl">Custo</div><div>${custo > 0 ? fmt(custo) : '—'}</div></div></div>
      <div class="fg c2"><div><div class="fl">Preco Varejo</div><div>${pv > 0 ? `${fmt(pv)} (${margemV.toFixed(1)}% margem)` : '—'}</div></div><div><div class="fl">Preco Atacado</div><div>${pa > 0 ? `${fmt(pa)} (${margemA.toFixed(1)}% margem)` : '—'}</div></div></div>
      <div class="fg c2"><div><div class="fl">Estoque inicial</div><div>${flowVal('p-esal')}</div></div><div><div class="fl">Estoque minimo</div><div>${flowVal('p-emin')}</div></div></div>
      ${incHtml}
    `;
    return;
  }

  if (flow === 'cli') {
    const el = document.getElementById('cli-flow-resumo');
    if (!el) return;
    const optins = [
      document.getElementById('c-optin-marketing')?.checked ? 'Marketing' : '',
      document.getElementById('c-optin-email')?.checked ? 'E-mail' : '',
      document.getElementById('c-optin-sms')?.checked ? 'SMS' : ''
    ]
      .filter(Boolean)
      .join(', ');
    const nome = flowVal('c-nome', '');
    const whatsapp = flowVal('c-whatsapp', '');
    const tel = flowVal('c-tel', '');
    const email = flowVal('c-email', '');
    const contatoCount = [whatsapp, tel, email].filter(Boolean).length;
    const optinEmail = !!document.getElementById('c-optin-email')?.checked;
    const optinSms = !!document.getElementById('c-optin-sms')?.checked;
    const optinMkt = !!document.getElementById('c-optin-marketing')?.checked;
    const inconsistencias = [];
    if (optinEmail && !email)
      inconsistencias.push('Opt-in de e-mail marcado sem e-mail cadastrado.');
    if (optinSms && !tel) inconsistencias.push('Opt-in de SMS marcado sem telefone.');
    if (optinMkt && !whatsapp && !tel && !email)
      inconsistencias.push('Opt-in de marketing marcado sem canal de contato.');
    const checks = [
      { ok: !!nome, label: 'Nome do cliente' },
      { ok: contatoCount > 0, label: 'Pelo menos 1 canal de contato' },
      { ok: !!flowVal('c-tab', ''), label: 'Tabela comercial' },
      { ok: !!flowVal('c-prazo', ''), label: 'Prazo comercial' }
    ];
    const checkHtml = checks
      .map(
        (c) =>
          `<span class="bdg ${c.ok ? 'bg' : 'br'}">${c.ok ? 'OK' : 'Pendente'} • ${c.label}</span>`
      )
      .join('');
    const canais =
      [whatsapp ? 'WhatsApp' : '', tel ? 'Telefone' : '', email ? 'E-mail' : '']
        .filter(Boolean)
        .join(', ') || 'Nenhum';
    const incHtml = inconsistencias.length
      ? `<div class="panel form-gap-top-xs"><div class="pt">Inconsistencias</div>${inconsistencias.map((i) => `<div class="detail-line">- ${i}</div>`).join('')}</div>`
      : `<div class="panel form-gap-top-xs"><div class="pt">Inconsistencias</div><div>Nenhuma inconsistência critica detectada.</div></div>`;
    el.innerHTML = `
      <div class="fg2 form-gap-bottom-xs gap-6">${checkHtml}</div>
      <div class="fg c2"><div><div class="fl">Cliente</div><div><b>${nome || '—'}</b></div></div><div><div class="fl">Apelido</div><div>${flowVal('c-apelido')}</div></div></div>
      <div class="fg c2"><div><div class="fl">Documento / Tipo</div><div>${flowVal('c-doc')} • ${flowVal('c-tipo')}</div></div><div><div class="fl">Status</div><div>${flowVal('c-status')}</div></div></div>
      <div class="fg c2"><div><div class="fl">Contato</div><div>${flowVal('c-tel')} • ${flowVal('c-whatsapp')} • ${flowVal('c-email')}</div></div><div><div class="fl">Aniversário</div><div>${flowVal('c-aniv')}</div></div></div>
      <div class="fg c2"><div><div class="fl">Comercial</div><div>${flowVal('c-seg')} • ${flowVal('c-tab')} • ${flowVal('c-prazo')}</div></div><div><div class="fl">Time(s)</div><div>${flowVal('c-time')}</div></div></div>
      <div class="fg c2"><div><div class="fl">Cidade / Estado</div><div>${flowVal('c-cidade')} • ${flowVal('c-estado')}</div></div><div><div class="fl">Opt-ins</div><div>${optins || 'Nenhum'}</div></div></div>
      <div class="panel form-gap-top-xs"><div class="pt">Impacto comercial</div><div>Canal(is) disponivel(is): <b>${canais}</b></div><div class="form-gap-top-xxs">Pronto para campanhas: <b>${optinMkt && contatoCount > 0 ? 'Sim' : 'Parcial'}</b></div></div>
      ${incHtml}
    `;
  }
}

export function setFlowStep(flow, rawStep) {
  const max = FLOW_MAX[flow];
  if (!max) return;
  const current = getFlowStep(flow);
  let step = Math.max(1, Math.min(max, Number(rawStep) || 1));
  if (step > current) {
    for (let s = current; s < step; s += 1) {
      if (!validateFlowStep(flow, s)) {
        step = current;
        break;
      }
    }
  }
  flowSteps[flow] = step;
  document.querySelectorAll(`.flow-step[data-flow-id="${flow}"]`).forEach((el) => {
    const node = /** @type {HTMLElement} */ (el);
    node.classList.toggle('on', Number(node.dataset.step) === step);
  });
  document.querySelectorAll(`.flow-chip[data-flow-chip="${flow}"]`).forEach((el) => {
    const node = /** @type {HTMLElement} */ (el);
    node.classList.toggle('on', Number(node.dataset.step) === step);
  });
  const prev = document.getElementById(`${flow}-flow-prev`);
  const next = document.getElementById(`${flow}-flow-next`);
  const save = document.getElementById(`${flow}-flow-save`);
  if (prev) prev.disabled = step <= 1;
  if (next) next.style.display = step >= max ? 'none' : 'inline-flex';
  if (save) save.style.display = step >= max ? 'inline-flex' : 'none';
  if (step === max) renderFlowSummary(flow);
}

export function initFlowWizards() {
  ['prod', 'cli'].forEach((flow) => setFlowStep(flow, 1));
  [
    'p-nome',
    'p-sku',
    'p-un',
    'p-cat',
    'p-custo',
    'p-pvv',
    'p-mkv',
    'p-mka',
    'p-pfa',
    'p-esal',
    'p-emin',
    'c-nome',
    'c-apelido',
    'c-doc',
    'c-tipo',
    'c-status',
    'c-tel',
    'c-whatsapp',
    'c-email',
    'c-aniv',
    'c-seg',
    'c-tab',
    'c-prazo',
    'c-time',
    'c-cidade',
    'c-estado',
    'c-optin-marketing',
    'c-optin-email',
    'c-optin-sms'
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const evt = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
    if (el.dataset.boundFlow) return;
    el.dataset.boundFlow = '1';
    el.addEventListener(evt, () => {
      if (getFlowStep('prod') === FLOW_MAX.prod) renderFlowSummary('prod');
      if (getFlowStep('cli') === FLOW_MAX.cli) renderFlowSummary('cli');
    });
  });
}
