// @ts-check

import { SEVERITY, guidedMessage } from './messages.js';

/** @typedef {import('./messages.js').SeverityValue} SeverityValue */
/** @typedef {Window & typeof globalThis & { _tt?: ReturnType<typeof setTimeout> }} ToastWindow */

export function uid(){
  return Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

/** @param {unknown} s */
export function norm(s){
  return String(s || '').toLowerCase().trim();
}

/** @param {unknown} v */
export function fmt(v){
  return 'R$ ' + Number(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** @param {number} v */
export function fmtK(v){
  return v >= 1000 ? 'R$ ' + (v / 1000).toFixed(1) + 'k' : 'R$ ' + Number(v || 0).toFixed(0);
}

/** @param {unknown} v @param {number} [d=2] */
export function fmtN(v, d = 2){
  return Number(v || 0).toFixed(d);
}

/** @param {unknown} v */
export function fmtQ(v){
  return Number(v || 0) % 1 === 0 ? String(Number(v || 0)) : Number(v || 0).toFixed(2);
}

/** @param {unknown} v */
export function pct(v){
  return Number(v || 0).toFixed(1) + '%';
}

/** @param {number} mk */
export function mk2mg(mk){
  return mk <= 0 ? 0 : mk / (1 + mk / 100) * 100;
}

/** @param {number} mg */
export function mg2mk(mg){
  return mg <= 0 || mg >= 100 ? 0 : mg / (1 - mg / 100) - 100;
}

/** @param {unknown} c @param {unknown} mk */
export function prV(c, mk){
  return Number(c || 0) * (1 + Number(mk || 0) / 100);
}

/** @param {string} id */
export function abrirModal(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.add('on');
  document.body.style.overflow = 'hidden';
  try{
    window.dispatchEvent(new CustomEvent('sc:modal-open', { detail: { id } }));
  }catch{}
}

/** @param {string} id */
export function fecharModal(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.remove('on');
  document.body.style.overflow = '';
  try{
    window.dispatchEvent(new CustomEvent('sc:modal-close', { detail: { id } }));
  }catch{}
}

/** @param {unknown} m */
export function toast(m){
  return notify(m, SEVERITY.INFO);
}

/**
 * @param {unknown} message
 * @param {SeverityValue} [severity=SEVERITY.INFO]
 * @param {number} [timeoutMs=3600]
 */
export function notify(message, severity = SEVERITY.INFO, timeoutMs = 3600){
  const el = document.getElementById('toast');
  if(!el) return;
  const toastWindow = /** @type {ToastWindow} */ (window);

  const msg = String(message ?? '').trim();
  const sev = String(severity || SEVERITY.INFO).toLowerCase();
  const cssClass =
    sev === SEVERITY.ERROR ? 'toast-error' :
    sev === SEVERITY.SUCCESS ? 'toast-success' :
    sev === SEVERITY.WARNING ? 'toast-warning' :
    'toast-info';

  el.classList.remove('toast-error', 'toast-success', 'toast-warning', 'toast-info');
  el.classList.add(cssClass);
  el.textContent = msg;
  el.title = msg;
  el.setAttribute('data-severity', sev);
  el.classList.add('on');

  try{
    window.dispatchEvent(new CustomEvent('sc:toast', { detail: { message: msg, severity: sev } }));
  }catch{}

  clearTimeout(toastWindow._tt);
  toastWindow._tt = setTimeout(() => {
    el.classList.remove('on');
    el.classList.remove('toast-error', 'toast-success', 'toast-warning', 'toast-info');
  }, timeoutMs);
}

/**
 * @param {{
 *   severity?: SeverityValue;
 *   what?: string;
 *   impact?: string;
 *   next?: string;
 *   timeoutMs?: number;
 * }} [input]
 */
export function notifyGuided({ severity = SEVERITY.INFO, what = '', impact = '', next = '', timeoutMs = 4200 } = {}){
  const msg = guidedMessage({ severity, what, impact, next });
  notify(msg, severity, timeoutMs);
  return msg;
}

/**
 * @param {string} id
 * @param {'error'|'success'|''} [state='error']
 */
export function markFieldState(id, state = 'error'){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.remove('is-error', 'is-success');
  if(state === 'error') el.classList.add('is-error');
  if(state === 'success') el.classList.add('is-success');
}

/**
 * @param {string} id
 * @param {{ markError?: boolean }} [options]
 */
export function focusField(id, { markError = false } = {}){
  const el = document.getElementById(id);
  if(!el) return;
  if(markError) markFieldState(id, 'error');
  try{
    el.focus();
    if('select' in el && typeof el.select === 'function') el.select();
  }catch{}
}

/**
 * @param {string | (HTMLElement & { dataset: DOMStringMap; disabled?: boolean; textContent: string | null }) | null | undefined} btn
 * @param {boolean} loading
 * @param {string} [idleLabel='']
 */
export function setButtonLoading(btn, loading, idleLabel = ''){
  const el = typeof btn === 'string'
    ? /** @type {(HTMLElement & { dataset: DOMStringMap; disabled?: boolean; textContent: string | null }) | null} */ (document.getElementById(btn))
    : btn;
  if(!el) return;

  if(loading){
    if(!el.dataset.idleLabel) el.dataset.idleLabel = el.textContent || idleLabel || '';
    el.classList.add('is-loading');
    if('disabled' in el) el.disabled = true;
    el.setAttribute('aria-busy', 'true');
    el.setAttribute('aria-live', 'polite');
    return;
  }

  el.classList.remove('is-loading');
  if('disabled' in el) el.disabled = false;
  el.removeAttribute('aria-busy');
  el.removeAttribute('aria-live');
  const label = idleLabel || el.dataset.idleLabel || '';
  if(label) el.textContent = label;
}

/**
 * @template T
 * @param {T[]} arr
 * @param {number} [size=200]
 * @returns {T[][]}
 */
export function chunkArray(arr, size = 200){
  /** @type {T[][]} */
  const out = [];
  for(let i = 0; i < arr.length; i += size){
    out.push(arr.slice(i, i + size));
  }
  return out;
}
