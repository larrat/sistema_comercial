import { SB } from '../js/api.js';
import { D, State, C } from '../js/store.js';
import { abrirModal, fecharModal, toast, notify, focusField } from '../core/utils.js';
import { MSG, SEVERITY } from '../core/messages.js';

let setFlowStepSafe = () => {};

export function initClientesModule(callbacks = {}){
  setFlowStepSafe = callbacks.setFlowStep || (() => {});
}

const AVC = [
  { bg:'#E6EEF9', c:'#0F2F5E' },
  { bg:'#E6F4EC', c:'#0D3D22' },
  { bg:'#FAF0D6', c:'#5C3900' },
  { bg:'#FAEBE9', c:'#731F18' }
];

function avc(n){
  const nome = String(n || 'X');
  return AVC[nome.charCodeAt(0) % AVC.length];
}

function ini(n){
  const p = String(n || '').trim().split(' ').filter(Boolean);
  if(!p.length) return 'CL';
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
}

function fmtAniv(iso){
  if(!iso) return '';
  const [y, m, d] = String(iso).split('-');
  if(!y || !m || !d) return iso;
  return `${d}/${m}`;
}

function getDiasParaAniversario(iso){
  if(!iso) return null;
  const [, m, d] = String(iso).split('-').map(Number);
  if(!m || !d) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let alvo = new Date(now.getFullYear(), m - 1, d);
  alvo.setHours(0, 0, 0, 0);
  if(alvo < now){
    alvo = new Date(now.getFullYear() + 1, m - 1, d);
    alvo.setHours(0, 0, 0, 0);
  }
  const diffMs = alvo.getTime() - now.getTime();
  return Math.round(diffMs / 86400000);
}

function getBadgeAniversario(c){
  if(!c?.data_aniversario) return '';
  const dias = getDiasParaAniversario(c.data_aniversario);
  if(dias == null) return `<span class="bdg bb">ðŸŽ‚ ${fmtAniv(c.data_aniversario)}</span>`;
  if(dias === 0) return '<span class="bdg br">ðŸŽ‚ Hoje</span>';
  if(dias <= 7) return `<span class="bdg ba">ðŸŽ‚ ${dias}d</span>`;
  return `<span class="bdg bb">ðŸŽ‚ ${fmtAniv(c.data_aniversario)}</span>`;
}

function getContatoInfo(c){
  const temWhatsapp = !!String(c?.whatsapp || '').trim();
  const temTel = !!String(c?.tel || '').trim();
  const temEmail = !!String(c?.email || '').trim();

  if(temWhatsapp){
    return {
      principal: `WhatsApp: ${c.whatsapp}`,
      secundario: temTel && c.tel !== c.whatsapp ? `Telefone: ${c.tel}` : '',
      badge: '<span class="bdg bg">WhatsApp</span>'
    };
  }
  if(temTel){
    return {
      principal: `Telefone: ${c.tel}`,
      secundario: temEmail ? c.email : '',
      badge: '<span class="bdg ba">Somente telefone</span>'
    };
  }
  if(temEmail){
    return {
      principal: c.email,
      secundario: '',
      badge: '<span class="bdg bb">Somente e-mail</span>'
    };
  }
  return {
    principal: 'Sem contato',
    secundario: '',
    badge: '<span class="bdg br">Sem contato</span>'
  };
}

const ST_B = {
  ativo:'<span class="bdg bg">Ativo</span>',
  inativo:'<span class="bdg bk">Inativo</span>',
  prospecto:'<span class="bdg bb">Prospecto</span>'
};

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

export function renderCliMet(){
  const c = C();
  const a = c.filter(x => x.status === 'ativo').length;
  const pr = c.filter(x => x.status === 'prospecto').length;
  const segs = [...new Set(c.map(x => x.seg).filter(Boolean))].length;

  const met = document.getElementById('cli-met');
  if(met){
    met.innerHTML = `
      <div class="met"><div class="ml">Total</div><div class="mv">${c.length}</div></div>
      <div class="met"><div class="ml">Ativos</div><div class="mv">${a}</div></div>
      <div class="met"><div class="ml">Prospectos</div><div class="mv">${pr}</div></div>
      <div class="met"><div class="ml">Segmentos</div><div class="mv">${segs}</div></div>
    `;
  }

  const sel = document.getElementById('cli-fil-seg');
  if(sel){
    const cur = sel.value;
    sel.innerHTML =
      '<option value="">Todos os segmentos</option>' +
      [...new Set(c.map(x => x.seg).filter(Boolean))]
        .sort()
        .map(s => `<option value="${s}">${s}</option>`)
        .join('');
    sel.value = cur;
  }
}

export function renderClientes(){
  const buscaEl = document.getElementById('cli-busca');
  const segEl = document.getElementById('cli-fil-seg');
  const stEl = document.getElementById('cli-fil-st');
  const el = document.getElementById('cli-lista');

  if(!el) return;

  const q = (buscaEl?.value || '').toLowerCase();
  const seg = segEl?.value || '';
  const st = stEl?.value || '';

  const f = C().filter(c =>
    (!q || c.nome.toLowerCase().includes(q) || (c.apelido || '').toLowerCase().includes(q) || parseTimes(c.time).join(' ').toLowerCase().includes(q)) &&
    (!seg || c.seg === seg) &&
    (!st || c.status === st)
  );

  if(!f.length){
    el.innerHTML = `<div class="empty"><div class="ico">ðŸ‘¥</div><p>${C().length ? 'Nenhum encontrado.' : 'Clique em "+ Novo cliente".'}</p></div>`;
    return;
  }

  const tabLbl = {
    padrao:'PadrÃ£o',
    especial:'<span class="bdg ba">Especial</span>',
    vip:'<span class="bdg br">VIP</span>'
  };

  const prazoLbl = {
    a_vista:'Ã€ vista',
    '7d':'7d',
    '15d':'15d',
    '30d':'30d',
    '60d':'60d'
  };

  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  if(isMobile){
    el.innerHTML = f.map(c => {
      const cor = avc(c.nome);
      const times = parseTimes(c.time);
      const contato = getContatoInfo(c);

      return `
        <div class="card mobile-card">
          <div class="mobile-card-head">
            <div style="display:flex;align-items:center;gap:10px;min-width:0">
              <div class="av" style="background:${cor.bg};color:${cor.c}">${ini(c.nome)}</div>
              <div style="min-width:0">
                <div class="mobile-card-title">${c.nome}</div>
                ${c.apelido ? `<div class="mobile-card-sub">${c.apelido}</div>` : ''}
              </div>
            </div>
            <div>${ST_B[c.status] || ''}</div>
          </div>

          <div class="mobile-card-meta" style="margin-bottom:8px">
            <div>${contato.principal}</div>
            ${contato.secundario ? `<div>${contato.secundario}</div>` : ''}
            ${c.email && contato.principal !== c.email ? `<div>${c.email}</div>` : ''}
            <div>${tabLbl[c.tab] || 'â€”'} â€¢ ${prazoLbl[c.prazo] || 'â€”'}</div>
          </div>

          <div class="mobile-card-tags" style="gap:4px">
            ${getBadgeAniversario(c)}
            ${contato.badge}
            ${c.optin_marketing ? '<span class="bdg bg">MKT</span>' : ''}
            ${c.optin_email ? '<span class="bdg bk">E-mail</span>' : ''}
            ${c.optin_sms ? '<span class="bdg bk">SMS</span>' : ''}
            ${c.seg ? `<span class="bdg bk">${c.seg}</span>` : ''}
            ${times.map(t => `<span class="bdg bb">âš½ ${t}</span>`).join('')}
          </div>

          <div class="mobile-card-actions">
            <button class="btn btn-sm" title="Ver cliente" data-click="abrirCliDet('${c.id}')">Detalhes</button>
            <button class="btn btn-p btn-sm" title="Editar cliente" data-click="editarCli('${c.id}')">Editar</button>
            <button class="btn btn-sm" title="Excluir cliente" data-click="removerCli('${c.id}')">Excluir</button>
          </div>
        </div>
      `;
    }).join('');
    return;
  }

  el.innerHTML = `
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th></th>
            <th>Nome</th>
            <th>Contato</th>
            <th>Marketing</th>
            <th>Segmento</th>
            <th>Tabela</th>
            <th>Prazo</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${f.map(c => {
            const cor = avc(c.nome);
            const times = parseTimes(c.time);
            const contato = getContatoInfo(c);
            return `
              <tr>
                <td><div class="av" style="background:${cor.bg};color:${cor.c}">${ini(c.nome)}</div></td>
                <td>
                  <div style="font-weight:600">${c.nome}</div>
                  ${c.apelido ? `<div style="font-size:11px;color:var(--tx3)">${c.apelido}</div>` : ''}
                </td>
                <td>
                  <div>${contato.principal}</div>
                  ${contato.secundario ? `<div style="font-size:11px;color:var(--tx3)">${contato.secundario}</div>` : ''}
                  ${c.email && contato.principal !== c.email ? `<div style="font-size:11px;color:var(--tx3)">${c.email}</div>` : ''}
                </td>
                <td>
                  <div class="fg2" style="gap:4px">
                    ${getBadgeAniversario(c) || '<span style="color:var(--tx3)">â€”</span>'}
                    ${contato.badge}
                    ${c.optin_marketing ? '<span class="bdg bg">MKT</span>' : ''}
                    ${c.optin_email ? '<span class="bdg bk">E-mail</span>' : ''}
                    ${c.optin_sms ? '<span class="bdg bk">SMS</span>' : ''}
                  </div>
                </td>
                <td>
                  <div class="fg2" style="gap:4px">
                    ${c.seg ? `<span class="bdg bk">${c.seg}</span>` : ''}
                    ${times.map(t => `<span class="bdg bb">âš½ ${t}</span>`).join('')}
                    ${!c.seg && !times.length ? 'â€”' : ''}
                  </div>
                </td>
                <td>${tabLbl[c.tab] || 'â€”'}</td>
                <td style="color:var(--tx2)">${prazoLbl[c.prazo] || 'â€”'}</td>
                <td>${ST_B[c.status] || ''}</td>
                <td>
                  <div class="fg2">
                    <button class="btn btn-sm" title="Ver cliente" data-click="abrirCliDet('${c.id}')">Detalhes</button>
                    <button class="btn btn-p btn-sm" title="Editar cliente" data-click="editarCli('${c.id}')">Editar</button>
                    <button class="btn btn-sm" title="Excluir cliente" data-click="removerCli('${c.id}')">Excluir</button>
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

export function renderCliSegs(){
  const segs = [...new Set(C().map(c => c.seg || 'Sem segmento'))].sort();
  const el = document.getElementById('cli-segs-lista');
  if(!el) return;

  el.innerHTML = segs.map(seg => {
    const cls = C().filter(c => (c.seg || 'Sem segmento') === seg);

    return `
      <div class="card">
        <div class="fb" style="margin-bottom:10px">
          <div style="font-weight:600">${seg}</div>
          <span class="bdg bb">${cls.length}</span>
        </div>
        <div class="fg2">
          ${cls.map(c => `
            <div
              data-click="abrirCliDet('${c.id}')"
              style="display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--bd);border-radius:var(--rad);cursor:pointer;transition:all .12s"
              onmouseover="this.style.background='var(--surf2)'"
              onmouseout="this.style.background=''"
            >
              <div class="av" style="width:26px;height:26px;font-size:11px;background:${avc(c.nome).bg};color:${avc(c.nome).c}">
                ${ini(c.nome)}
              </div>
              <span style="font-size:13px;font-weight:500">${c.apelido || c.nome}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

export async function abrirCliDet(id){
  const c = C().find(x => x.id === id);
  if(!c) return;

  const cor = avc(c.nome);
  let notas = [];

  try{
    notas = await SB.getNotas(id) || [];
  }catch(e){
    console.error('Erro ao carregar notas do cliente', e);
  }

  const prazoLbl = {
    a_vista:'Ã€ vista',
    '7d':'7 dias',
    '15d':'15 dias',
    '30d':'30 dias',
    '60d':'60 dias'
  };

  const box = document.getElementById('cli-det-box');
  if(!box) return;

  box.innerHTML = `
    <div class="fb" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="av" style="width:44px;height:44px;font-size:16px;background:${cor.bg};color:${cor.c}">
          ${ini(c.nome)}
        </div>
        <div>
          <div style="font-size:16px;font-weight:600">${c.nome}</div>
          ${c.apelido ? `<div style="font-size:13px;color:var(--tx2)">${c.apelido}</div>` : ''}
          <div style="margin-top:4px">${ST_B[c.status] || ''}</div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;font-size:13px">
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--tx3);text-transform:uppercase;margin-bottom:6px">Contato</div>
        ${[
          c.resp && `Resp: ${c.resp}`,
          c.tel,
          c.whatsapp && `WhatsApp: ${c.whatsapp}`,
          c.email,
          c.data_aniversario && `AniversÃ¡rio: ${c.data_aniversario}`,
          c.cidade && `${c.cidade}${c.estado ? ' - ' + c.estado : ''}`
        ].filter(Boolean).map(x => `<div style="margin-bottom:3px">${x}</div>`).join('') || 'â€”'}
      </div>

      <div>
        <div style="font-size:11px;font-weight:600;color:var(--tx3);text-transform:uppercase;margin-bottom:6px">Comercial</div>
        <div>Tabela: ${({ padrao:'PadrÃ£o', especial:'Especial', vip:'VIP' }[c.tab] || 'â€”')}</div>
        <div>Prazo: ${prazoLbl[c.prazo] || 'â€”'}</div>
        ${parseTimes(c.time).length ? `<div>Time(s): ${parseTimes(c.time).join(', ')}</div>` : ''}
        ${c.seg ? `<div>Segmento: ${c.seg}</div>` : ''}
      </div>
    </div>

    ${c.obs ? `
      <div class="panel" style="margin-bottom:12px">
        <div class="pt">ObservaÃ§Ãµes</div>
        <p style="font-size:13px">${c.obs}</p>
      </div>
    ` : ''}

    <div style="font-size:11px;font-weight:600;color:var(--tx3);text-transform:uppercase;margin-bottom:8px">Notas / histÃ³rico</div>
    <div class="fg2" style="margin-bottom:8px">
      <input class="inp" id="nota-inp-${id}" placeholder="Adicionar nota..." style="flex:1">
      <button class="btn btn-sm" data-click="addNota('${id}')">+</button>
    </div>

    <div id="notas-${id}">
      ${notas.length
        ? notas.map(n => `
            <div class="nota">
              <div>${n.texto}</div>
              <div class="nota-d">${n.data}</div>
            </div>
          `).join('')
        : '<div style="font-size:13px;color:var(--tx3)">Nenhuma nota.</div>'
      }
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn" data-click="fecharModal('modal-cli-det')">Fechar</button>
      <button class="btn btn-p" data-click="fecharModal('modal-cli-det');editarCli('${id}')">Editar</button>
    </div>
  `;

  abrirModal('modal-cli-det');
}

export async function addNota(id){
  const inp = document.getElementById('nota-inp-' + id);
  const txt = (inp?.value || '').trim();
  if(!txt) return;

  const nota = {
    cliente_id: id,
    texto: txt,
    data: new Date().toLocaleString('pt-BR')
  };

  try{
    await SB.insertNota(nota);
  }catch(e){
    toast('Erro: ' + e.message);
    return;
  }

  if(!D.notas) D.notas = {};
  if(!D.notas[id]) D.notas[id] = [];
  D.notas[id].unshift(nota);

  if(inp) inp.value = '';

  const notasEl = document.getElementById('notas-' + id);
  if(notasEl){
    notasEl.innerHTML = D.notas[id]
      .map(n => `
        <div class="nota">
          <div>${n.texto}</div>
          <div class="nota-d">${n.data}</div>
        </div>
      `).join('');
  }

  toast('Nota adicionada!');
}

export function limparFormCli(){
  State.editIds.cli = null;

  const titulo = document.getElementById('cli-modal-titulo');
  if(titulo) titulo.textContent = 'Novo cliente';
  const saveBtn = document.getElementById('cli-flow-save');
  if(saveBtn) saveBtn.textContent = 'Salvar cliente';

  [
    'c-nome','c-apelido','c-doc','c-tel','c-whatsapp','c-email','c-aniv','c-time',
    'c-resp','c-seg','c-cidade','c-estado','c-obs'
  ].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = '';
  });

  const tipo = document.getElementById('c-tipo');
  const status = document.getElementById('c-status');
  const tab = document.getElementById('c-tab');
  const prazo = document.getElementById('c-prazo');

  if(tipo) tipo.value = 'PJ';
  if(status) status.value = 'ativo';
  if(tab) tab.value = 'padrao';
  if(prazo) prazo.value = 'a_vista';

  const optinMarketing = document.getElementById('c-optin-marketing');
  const optinEmail = document.getElementById('c-optin-email');
  const optinSms = document.getElementById('c-optin-sms');
  if(optinMarketing) optinMarketing.checked = false;
  if(optinEmail) optinEmail.checked = false;
  if(optinSms) optinSms.checked = false;

  setFlowStepSafe('cli', 1);
}

export function editarCli(id){
  const c = C().find(x => x.id === id);
  if(!c) return;

  State.editIds.cli = id;

  const titulo = document.getElementById('cli-modal-titulo');
  if(titulo) titulo.textContent = 'Editar cliente';
  const saveBtn = document.getElementById('cli-flow-save');
  if(saveBtn) saveBtn.textContent = 'Atualizar cliente';

  document.getElementById('c-nome').value = c.nome || '';
  document.getElementById('c-apelido').value = c.apelido || '';
  document.getElementById('c-doc').value = c.doc || '';
  document.getElementById('c-tipo').value = c.tipo || 'PJ';
  document.getElementById('c-status').value = c.status || 'ativo';
  document.getElementById('c-tel').value = c.tel || '';
  document.getElementById('c-whatsapp').value = c.whatsapp || '';
  document.getElementById('c-email').value = c.email || '';
  document.getElementById('c-aniv').value = c.data_aniversario || '';
  document.getElementById('c-time').value = parseTimes(c.time).join(', ');
  document.getElementById('c-resp').value = c.resp || '';
  document.getElementById('c-seg').value = c.seg || '';
  document.getElementById('c-tab').value = c.tab || 'padrao';
  document.getElementById('c-prazo').value = c.prazo || 'a_vista';
  document.getElementById('c-cidade').value = c.cidade || '';
  document.getElementById('c-estado').value = c.estado || '';
  document.getElementById('c-obs').value = c.obs || '';
  document.getElementById('c-optin-marketing').checked = !!c.optin_marketing;
  document.getElementById('c-optin-email').checked = !!c.optin_email;
  document.getElementById('c-optin-sms').checked = !!c.optin_sms;

  setFlowStepSafe('cli', 1);

  abrirModal('modal-cliente');
}

export async function salvarCliente(){
  const nome = document.getElementById('c-nome').value.trim();
  if(!nome){
    notify(MSG.forms.required('Nome do cliente'), SEVERITY.WARNING);
    focusField('c-nome', { markError: true });
    return;
  }

  const c = {
    id: State.editIds.cli || (Date.now() + '-' + Math.random().toString(36).slice(2,8)),
    filial_id: State.FIL,
    nome,
    apelido: document.getElementById('c-apelido').value.trim(),
    doc: document.getElementById('c-doc').value.trim(),
    tipo: document.getElementById('c-tipo').value,
    status: document.getElementById('c-status').value,
    tel: document.getElementById('c-tel').value.trim(),
    whatsapp: document.getElementById('c-whatsapp').value.trim(),
    email: document.getElementById('c-email').value.trim(),
    data_aniversario: document.getElementById('c-aniv').value || null,
    optin_marketing: !!document.getElementById('c-optin-marketing').checked,
    optin_email: !!document.getElementById('c-optin-email').checked,
    optin_sms: !!document.getElementById('c-optin-sms').checked,
    time: parseTimes(document.getElementById('c-time').value).join(', '),
    resp: document.getElementById('c-resp').value.trim(),
    seg: document.getElementById('c-seg').value.trim(),
    tab: document.getElementById('c-tab').value,
    prazo: document.getElementById('c-prazo').value,
    cidade: document.getElementById('c-cidade').value.trim(),
    estado: document.getElementById('c-estado').value.trim(),
    obs: document.getElementById('c-obs').value.trim()
  };

  try{
    await SB.upsertCliente(c);
  }catch(e){
    notify(
      `Erro: falha ao salvar cliente (${String(e?.message || 'erro desconhecido')}). Impacto: cadastro nÃ£o foi concluÃ­do. AÃ§Ã£o: revise os dados e tente novamente.`,
      SEVERITY.ERROR
    );
    return;
  }

  if(State.editIds.cli){
    D.clientes[State.FIL] = C().map(x => x.id === State.editIds.cli ? c : x);
  } else {
    if(!D.clientes[State.FIL]) D.clientes[State.FIL] = [];
    D.clientes[State.FIL].push(c);
  }

  fecharModal('modal-cliente');
  renderCliMet();
  renderClientes();
  refreshCliDL();

  const canais = [c.whatsapp ? 'WhatsApp' : '', c.tel ? 'Telefone' : '', c.email ? 'E-mail' : ''].filter(Boolean);
  const prontoCamp = c.optin_marketing && canais.length > 0;
  notify(
    State.editIds.cli
      ? `Cliente atualizado: ${c.nome} â€¢ Canais: ${canais.join(', ') || 'nenhum'} â€¢ Campanhas: ${prontoCamp ? 'pronto' : 'parcial'}`
      : `Cliente cadastrado: ${c.nome} â€¢ Canais: ${canais.join(', ') || 'nenhum'} â€¢ Campanhas: ${prontoCamp ? 'pronto' : 'parcial'}`,
    SEVERITY.SUCCESS
  );
}

export async function removerCli(id){
  if(!confirm('Remover?')) return;

  try{
    await SB.deleteCliente(id);
  }catch(e){
    toast('Erro: ' + e.message);
    return;
  }

  D.clientes[State.FIL] = C().filter(c => c.id !== id);

  renderCliMet();
  renderClientes();
  refreshCliDL();

  toast('Removido.');
}

export function refreshCliDL(){
  const dl = document.getElementById('cli-dl');
  if(dl){
    dl.innerHTML = C().map(c => `<option value="${c.nome}">`).join('');
  }
}
