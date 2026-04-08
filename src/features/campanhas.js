import { SB } from '../app/api.js';
import { D, State, C } from '../app/store.js';
import { abrirModal, fecharModal, toast, uid, setButtonLoading, notify, focusField } from '../shared/utils.js';
import { MSG, SEVERITY } from '../shared/messages.js';

let campDiag = {
  filialId: null,
  carregadasFilial: 0,
  totalBanco: null,
  outrasFiliais: null,
  candidatasOutrasFiliais: [],
  origem: 'cache',
  erro: null
};

function getCampanhasCache() {
  if (!D.campanhas) D.campanhas = {};
  if (!D.campanhas[State.FIL]) D.campanhas[State.FIL] = [];
  return D.campanhas[State.FIL];
}

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
  return key || '—';
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

function renderCampDiag() {
  const el = document.getElementById('camp-diag');
  if (!el) return;

  const base = `Filial ativa: ${campDiag.filialId || '—'} • campanhas exibidas: ${campDiag.carregadasFilial}`;
  const banco = campDiag.totalBanco == null ? '' : ` • total no banco: ${campDiag.totalBanco}`;
  const outras = campDiag.outrasFiliais == null ? '' : ` • outras filiais: ${campDiag.outrasFiliais}`;
  const origem = campDiag.origem ? ` • origem: ${campDiag.origem}` : '';
  const podeImportar = (campDiag.candidatasOutrasFiliais || []).length > 0 && campDiag.carregadasFilial === 0;
  const acao = podeImportar
    ? ` <button class="btn btn-sm" style="margin-left:8px" data-click="adotarCampanhasParaFilialAtiva()">Importar para filial ativa</button>`
    : '';

  el.innerHTML = `<div class="alert al-a" style="margin-bottom:10px">ℹ ${base}${banco}${outras}${origem}${acao}</div>`;
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
    toast('Nenhuma campanha disponível para importar.');
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
    toast('As campanhas candidatas já existem na filial ativa.');
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
  toast(`Importação concluída: ${importadas} campanha(s), ${falhasPersistencia} falha(s) de persistência.`);
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
  setInputValue('camp-mensagem', 'Olá, {{nome}}! 🎉\n\nPreparamos uma condição especial para você:\n{{desconto}} de desconto com o cupom {{cupom}}.\n\nVálido até {{validade}}.');
  setInputValue('camp-cupom', '');
  setInputValue('camp-desconto', 0);

  const ativo = document.getElementById('camp-ativo');
  if (ativo) ativo.checked = true;
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

  abrirModal('modal-campanha');
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
    notify('Erro: não foi possível remover no banco. Ação: tente novamente.', SEVERITY.ERROR);
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

  const el = document.getElementById('camp-met');
  if (!el) return;

  el.innerHTML = `
    <div class="met"><div class="ml">Campanhas</div><div class="mv">${campanhas.length}</div></div>
    <div class="met"><div class="ml">Ativas</div><div class="mv">${ativas}</div></div>
    <div class="met"><div class="ml">Fila</div><div class="mv">${pendentes}</div></div>
    <div class="met"><div class="ml">Enviados</div><div class="mv">${enviados}</div></div>
  `;
}

export function renderCampanhas() {
  const campanhas = getCampanhasCache();
  const envios = getEnviosCache();
  const el = document.getElementById('camp-lista');
  if (!el) return;
  renderCampDiag();

  const pendentes = envios.filter(e => e.status === 'pendente' || e.status === 'manual').length;
  const falhas = envios.filter(e => e.status === 'falhou').length;
  const enviadas = envios.filter(e => e.status === 'enviado').length;

  if (!campanhas.length) {
    el.innerHTML = `
      <div class="camp-quick">
        <span class="bdg bb">Fila: ${pendentes}</span>
        <span class="bdg br">Falhas: ${falhas}</span>
        <span class="bdg bg">Enviadas: ${enviadas}</span>
      </div>
      <div class="empty"><div class="ico">🎂</div><p>Nenhuma campanha cadastrada.</p></div>
    `;
    return;
  }

  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  if(isMobile){
    el.innerHTML = `
      <div class="camp-quick">
        <span class="bdg bb">Fila: ${pendentes}</span>
        <span class="bdg br">Falhas: ${falhas}</span>
        <span class="bdg bg">Enviadas: ${enviadas}</span>
      </div>
      ${campanhas.map(c => `
      <div class="card mobile-card">
        <div class="mobile-card-head">
          <div style="min-width:0">
            <div class="mobile-card-title">${c.nome}</div>
            <div class="mobile-card-tags" style="margin-top:4px;margin-bottom:0;gap:4px">
              <span class="bdg bk">${c.tipo || 'aniversario'}</span>
              <span class="bdg bb">${labelCanal(c.canal)}</span>
              ${badgeSaudeCampanha(c, envios)}
            </div>
          </div>
          <div>${c.ativo ? '<span class="bdg bg">Ativa</span>' : '<span class="bdg br">Inativa</span>'}</div>
        </div>

        <div class="mobile-card-meta">
          <div>Antecedência: <b style="color:var(--tx)">${Number(c.dias_antecedencia || 0)} dia(s)</b></div>
          <div>Desconto: <b style="color:var(--tx)">${Number(c.desconto || 0)}%</b></div>
          <div>Cupom: <b style="color:var(--tx)">${c.cupom || '—'}</b></div>
        </div>

        <div class="mobile-card-actions">
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
    <div class="camp-quick">
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
              <td style="font-weight:600">${c.nome}</td>
              <td><span class="bdg bk">${c.tipo || 'aniversario'}</span></td>
              <td><span class="bdg bb">${labelCanal(c.canal)}</span></td>
              <td>${Number(c.dias_antecedencia || 0)} dia(s)</td>
              <td>${Number(c.desconto || 0)}%</td>
              <td>${c.cupom || '—'}</td>
              <td>
                <div class="fg2" style="gap:4px">
                  ${c.ativo ? '<span class="bdg bg">Ativa</span>' : '<span class="bdg br">Inativa</span>'}
                  ${badgeSaudeCampanha(c, envios)}
                </div>
              </td>
              <td>
                <div class="fg2 camp-actions">
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

export async function gerarFilaCampanha(campanhaId) {
  const campanha = getCampanhasCache().find(c => c.id === campanhaId);
  if (!campanha) {
    notify(MSG.campanhas.notFound, SEVERITY.ERROR);
    return;
  }

  setBotaoGerarFilaLoading(campanhaId, true);

  if(!campanha.ativo){
    setBotaoGerarFilaLoading(campanhaId, false);
    notify(MSG.campanhas.inactive, SEVERITY.WARNING);
    return;
  }
  const queueResult = await SB.toResult(() => SB.gerarFilaCampanhaEdge(campanhaId, false));
  if (!queueResult.ok) {
    setBotaoGerarFilaLoading(campanhaId, false);
    notify(MSG.campanhas.queueFetchFailed(queueResult.error?.message), SEVERITY.ERROR);
    return;
  }

  const resumo = queueResult.data || {};
  await carregarCampanhaEnvios();
  renderCampanhasMet();
  renderFilaWhatsApp();
  renderCampanhaEnvios();
  setBotaoGerarFilaLoading(campanhaId, false);

  if (!Number(resumo.total_elegiveis || 0) && !Number(resumo.criados || 0)) {
    notify(MSG.campanhas.noEligible(), SEVERITY.INFO);
    return;
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
  const envios = getEnviosCache()
    .filter(e => e.canal === 'whatsapp_manual')
    .sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')));

  const el = document.getElementById('camp-wa-fila');
  if (!el) return;

  if (!envios.length) {
    el.innerHTML = `<div class="empty"><div class="ico">💬</div><p>Nenhum WhatsApp pendente.</p></div>`;
    return;
  }

  const pendentes = envios.filter(e => e.status === 'manual' || e.status === 'pendente').length;
  const falhas = envios.filter(e => e.status === 'falhou').length;
  const isMobile = window.matchMedia('(max-width: 760px)').matches;

  if(isMobile){
    el.innerHTML = `
      <div class="camp-quick">
        <span class="bdg bb">Pendentes: ${pendentes}</span>
        <span class="bdg br">Falhas: ${falhas}</span>
      </div>
      ${envios.map(e => {
        const cliente = (C() || []).find(c => c.id === e.cliente_id);
        const campanha = getCampanhasCache().find(c => c.id === e.campanha_id);
        return `
          <div class="card mobile-card">
            <div class="mobile-card-head">
              <div style="min-width:0">
                <div class="mobile-card-title">${cliente?.nome || e.cliente_id}</div>
                <div class="mobile-card-sub">${campanha?.nome || '—'} • ${formatarDataBR(e.data_ref)}</div>
              </div>
              <span class="bdg ${e.status === 'enviado' ? 'bg' : e.status === 'falhou' ? 'br' : 'ba'}">${e.status}</span>
            </div>
            <div class="mobile-card-meta">
              <div>Destino: <b style="color:var(--tx)">${e.destino || '—'}</b></div>
              <div>Canal: <b style="color:var(--tx2)">${labelCanal(e.canal)}</b></div>
            </div>
            <div class="mobile-card-actions">
              <button class="btn btn-p btn-sm" data-click="abrirWhatsAppEnvio('${e.id}')">Abrir WhatsApp</button>
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
    <div class="camp-quick">
      <span class="bdg bb">Pendentes: ${pendentes}</span>
      <span class="bdg br">Falhas: ${falhas}</span>
    </div>
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
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
                <td style="font-weight:600">${cliente?.nome || e.cliente_id}</td>
                <td>${e.destino || '—'}</td>
                <td>${campanha?.nome || '—'}</td>
                <td>${formatarDataBR(e.data_ref)}</td>
                <td><span class="bdg ${e.status === 'enviado' ? 'bg' : e.status === 'falhou' ? 'br' : 'ba'}">${e.status}</span></td>
                <td>
                  <div class="fg2">
                    <button class="btn btn-p btn-sm" data-click="abrirWhatsAppEnvio('${e.id}')">Abrir WhatsApp</button>
                    <button class="ib" title="Marcar como enviado" data-click="marcarEnvioEnviado('${e.id}')">OK</button>
                    <button class="ib" title="Marcar como falhou" data-click="marcarEnvioFalhou('${e.id}')">FAL</button>
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

export function renderCampanhaEnvios() {
  const envios = getEnviosCache().slice().sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')));
  const el = document.getElementById('camp-envios-lista');
  if (!el) return;

  if (!envios.length) {
    el.innerHTML = `<div class="empty"><div class="ico">📨</div><p>Nenhum envio registrado.</p></div>`;
    return;
  }

  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  if(isMobile){
    el.innerHTML = envios.map(e => {
      const cliente = (C() || []).find(c => c.id === e.cliente_id);
      return `
        <div class="card mobile-card">
          <div class="mobile-card-head">
            <div style="min-width:0">
              <div class="mobile-card-title">${cliente?.nome || e.cliente_id}</div>
              <div class="mobile-card-sub">${labelCanal(e.canal)} • ${formatarDataBR(e.data_ref)}</div>
            </div>
            <span class="bdg ${e.status === 'enviado' ? 'bg' : e.status === 'falhou' ? 'br' : 'ba'}">${e.status}</span>
          </div>
          <div class="mobile-card-meta">
            <div>Destino: <b style="color:var(--tx)">${e.destino || '—'}</b></div>
            <div>Criado em: <b style="color:var(--tx2)">${e.criado_em ? new Date(e.criado_em).toLocaleString('pt-BR') : '—'}</b></div>
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
            <th>Cliente</th>
            <th>Canal</th>
            <th>Destino</th>
            <th>Status</th>
            <th>Data ref</th>
            <th>Criado em</th>
          </tr>
        </thead>
        <tbody>
          ${envios.map(e => {
            const cliente = (C() || []).find(c => c.id === e.cliente_id);
            return `
              <tr>
                <td style="font-weight:600">${cliente?.nome || e.cliente_id}</td>
                <td><span class="bdg bk">${labelCanal(e.canal)}</span></td>
                <td>${e.destino || '—'}</td>
                <td><span class="bdg ${e.status === 'enviado' ? 'bg' : e.status === 'falhou' ? 'br' : 'ba'}">${e.status}</span></td>
                <td>${formatarDataBR(e.data_ref)}</td>
                <td>${e.criado_em ? new Date(e.criado_em).toLocaleString('pt-BR') : '—'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export async function abrirWhatsAppEnvio(envioId) {
  const envio = getEnviosCache().find(e => e.id === envioId);
  if (!envio) {
    notify('Erro: envio não encontrado. Impacto: não foi possível abrir a conversa. Ação: atualize a fila e tente novamente.', SEVERITY.ERROR);
    return;
  }

  if (!envio.destino) {
    notify(MSG.campanhas.missingDestino, SEVERITY.WARNING);
    return;
  }

  const url = buildWhatsAppUrl(envio.destino, envio.mensagem);
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function marcarEnvioEnviado(envioId) {
  const envio = getEnviosCache().find(e => e.id === envioId);
  if (!envio) return;

  const payload = {
    ...envio,
    status: 'enviado',
    enviado_em: new Date().toISOString()
  };

  const updateResult = await SB.toResult(() => SB.updateCampanhaEnvio(payload));
  if (!updateResult.ok) {
    notify(MSG.campanhas.envioUpdateFailed(updateResult.error?.message), SEVERITY.ERROR);
    return;
  }

  const idx = getEnviosCache().findIndex(e => e.id === envioId);
  if (idx >= 0) getEnviosCache()[idx] = payload;

  renderCampanhasMet();
  renderFilaWhatsApp();
  renderCampanhaEnvios();
  notify('Sucesso: envio marcado como enviado.', SEVERITY.SUCCESS);
}

export async function marcarEnvioFalhou(envioId) {
  const envio = getEnviosCache().find(e => e.id === envioId);
  if (!envio) return;

  const motivo = prompt('Informe o motivo da falha:', envio.erro || '') || null;

  const payload = {
    ...envio,
    status: 'falhou',
    erro: motivo
  };

  const updateResult = await SB.toResult(() => SB.updateCampanhaEnvio(payload));
  if (!updateResult.ok) {
    notify(MSG.campanhas.envioUpdateFailed(updateResult.error?.message), SEVERITY.ERROR);
    return;
  }

  const idx = getEnviosCache().findIndex(e => e.id === envioId);
  if (idx >= 0) getEnviosCache()[idx] = payload;

  renderCampanhasMet();
  renderFilaWhatsApp();
  renderCampanhaEnvios();
  notify('Atenção: envio marcado como falho. Impacto: cliente não recebeu a mensagem. Ação: revise o motivo e tente novo envio.', SEVERITY.WARNING);
}

