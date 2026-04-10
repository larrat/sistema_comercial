// @ts-check

import { SB } from '../app/api.js';
import { D, State, RCAS } from '../app/store.js';
import { abrirModal, fecharModal, focusField, notify, uid } from '../shared/utils.js';
import { SEVERITY } from '../shared/messages.js';

/** @typedef {import('../types/domain').Rca} Rca */

let rcaTargetFieldId = null;

function getRcasCache(){
  if(!D.rcas) D.rcas = {};
  if(!D.rcas[State.FIL]) D.rcas[State.FIL] = [];
  return D.rcas[State.FIL];
}

/**
 * @param {unknown} value
 */
function esc(value){
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @param {string | null | undefined} nome
 */
function buildRcaInicial(nome){
  const parts = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return '';
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

export function refreshRcaSelectors(){
  const options = [
    '<option value="">Sem RCA</option>',
    ...RCAS()
      .filter(rca => rca.ativo !== false)
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
      .map(rca => `<option value="${esc(rca.id)}">${esc(rca.nome)}</option>`)
  ].join('');

  ['c-rca', 'pd-rca'].forEach(id => {
    const el = /** @type {HTMLSelectElement | null} */ (document.getElementById(id));
    if(!el) return;
    const current = el.value || '';
    el.innerHTML = options;
    el.value = current;
  });
}

/**
 * @param {string | null | undefined} rcaId
 */
export function getRcaNomeById(rcaId){
  const id = String(rcaId || '').trim();
  if(!id) return '';
  return String(getRcasCache().find(item => item.id === id)?.nome || '').trim();
}

/**
 * @param {string | null | undefined} targetId
 */
export function abrirModalRca(targetId = null){
  rcaTargetFieldId = targetId ? String(targetId) : null;
  const titulo = document.getElementById('rca-modal-titulo');
  const nome = /** @type {HTMLInputElement | null} */ (document.getElementById('rca-nome'));
  if(titulo) titulo.textContent = 'Novo RCA';
  if(nome) nome.value = '';
  abrirModal('modal-rca');
  focusField('rca-nome');
}

export async function salvarRca(){
  const nomeEl = /** @type {HTMLInputElement | null} */ (document.getElementById('rca-nome'));
  const nome = String(nomeEl?.value || '').trim();
  if(!nome){
    notify('Informe o nome do RCA para salvar.', SEVERITY.WARNING);
    focusField('rca-nome', { markError: true });
    return;
  }

  const duplicado = getRcasCache().find(item => String(item.nome || '').trim().toLowerCase() === nome.toLowerCase());
  if(duplicado){
    notify(`Este RCA já existe: ${duplicado.nome}.`, SEVERITY.INFO);
    if(rcaTargetFieldId){
      refreshRcaSelectors();
      const target = /** @type {HTMLSelectElement | null} */ (document.getElementById(rcaTargetFieldId));
      if(target) target.value = duplicado.id;
    }
    fecharModal('modal-rca');
    return;
  }

  /** @type {Rca} */
  const rca = {
    id: uid(),
    filial_id: State.FIL,
    nome,
    inicial: buildRcaInicial(nome),
    ativo: true
  };

  try{
    await SB.upsertRca(rca);
  }catch(error){
    notify(`Erro ao salvar RCA: ${String(error instanceof Error ? error.message : 'erro desconhecido')}.`, SEVERITY.ERROR);
    return;
  }

  if(!D.rcas[State.FIL]) D.rcas[State.FIL] = [];
  D.rcas[State.FIL].push(rca);
  D.rcas[State.FIL] = RCAS().slice().sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));

  refreshRcaSelectors();

  if(rcaTargetFieldId){
    const target = /** @type {HTMLSelectElement | null} */ (document.getElementById(rcaTargetFieldId));
    if(target) target.value = rca.id;
  }

  fecharModal('modal-rca');
  notify(`RCA cadastrado: ${rca.nome}.`, SEVERITY.SUCCESS);
}
