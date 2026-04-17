// @ts-check

import { createScreenDom } from '../shared/dom.js';

/** @typedef {import('../types/domain').Cliente} Cliente */

/** @type {import('../types/domain').ScreenDom} */
export const cliDom = createScreenDom('clientes', [
  'cli-met',
  'cli-fil-seg',
  'cli-busca',
  'cli-fil-st',
  'cli-lista',
  'cli-segs-lista',
  'cli-modal-titulo',
  'cli-flow-save',
  'cli-dl',
  'cli-det-box',
  'c-rca'
]);

const AVC = [
  { bg: '#E6EEF9', c: '#0F2F5E' },
  { bg: '#E6F4EC', c: '#0D3D22' },
  { bg: '#FAF0D6', c: '#5C3900' },
  { bg: '#FAEBE9', c: '#731F18' }
];

/**
 * @param {unknown} value
 */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @param {unknown} nome
 */
export function avc(nome) {
  const value = String(nome || 'X');
  return AVC[value.charCodeAt(0) % AVC.length];
}

/**
 * @param {unknown} nome
 */
export function ini(nome) {
  const parts = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'CL';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

/**
 * @param {string | null | undefined} iso
 */
export function fmtAniv(iso) {
  if (!iso) return '';
  const [year, month, day] = String(iso).split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}`;
}

/**
 * @param {string | null | undefined} iso
 */
export function getDiasParaAniversario(iso) {
  if (!iso) return null;

  const [, month, day] = String(iso).split('-').map(Number);
  if (!month || !day) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let alvo = new Date(hoje.getFullYear(), month - 1, day);
  alvo.setHours(0, 0, 0, 0);

  if (alvo < hoje) {
    alvo = new Date(hoje.getFullYear() + 1, month - 1, day);
    alvo.setHours(0, 0, 0, 0);
  }

  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

/**
 * @param {Cliente | null | undefined} cliente
 */
export function getBadgeAniversario(cliente) {
  if (!cliente?.data_aniversario) return '';

  const dias = getDiasParaAniversario(cliente.data_aniversario);
  if (dias == null) {
    return `<span class="bdg bb">Aniv ${esc(fmtAniv(cliente.data_aniversario))}</span>`;
  }
  if (dias === 0) {
    return '<span class="bdg br">Aniv hoje</span>';
  }
  if (dias <= 7) {
    return `<span class="bdg ba">Aniv ${dias}d</span>`;
  }
  return `<span class="bdg bb">Aniv ${esc(fmtAniv(cliente.data_aniversario))}</span>`;
}

export function isClientesRuntimeBootstrapping() {
  return document.body.dataset.runtimeBootstrap === 'starting';
}
