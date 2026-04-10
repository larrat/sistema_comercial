// @ts-check

/**
 * Sanitização de strings para uso seguro em innerHTML.
 *
 * Contexto: o sistema usa innerHTML extensivamente via dom.js/createScreenDom.
 * Dados de campos de texto (nome, descrição, observação) chegam do Supabase
 * e são inseridos no DOM. Embora o Supabase + RLS mitigue ataques server-side,
 * um dado malicioso persistido por um usuário autenticado poderia causar XSS
 * ao ser renderizado para outros usuários.
 *
 * Estratégia: escapeHtml() para texto puro; allowlist mínima para HTML estrutural.
 */

const ESC_MAP = /** @type {const} */ ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
});

const ESC_PATTERN = /[&<>"'`=/]/g;

/**
 * Escapa caracteres especiais HTML em uma string.
 * Use sempre que inserir dados do usuário/servidor em template strings HTML.
 *
 * @param {unknown} value
 * @returns {string}
 *
 * @example
 * // ANTES (vulnerável):
 * el.innerHTML = `<div>${cliente.nome}</div>`;
 *
 * // DEPOIS (seguro):
 * el.innerHTML = `<div>${esc(cliente.nome)}</div>`;
 */
export function esc(value){
  if(value == null) return '';
  return String(value).replace(ESC_PATTERN, ch => ESC_MAP[/** @type {keyof typeof ESC_MAP} */ (ch)]);
}

/**
 * Alias semântico para uso em templates HTML.
 * Idêntico a esc() — escolha o nome que torna o código mais legível no contexto.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const escapeHtml = esc;

/**
 * Sanitiza um valor para uso em atributos HTML (ex: data-id, title, placeholder).
 * Remove aspas duplas e simples para evitar quebra de atributo.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escAttr(value){
  if(value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitiza um valor para uso seguro em data-click e similares.
 * Remove aspas simples para não quebrar expressões como data-click="ir('page')".
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escDataAttr(value){
  if(value == null) return '';
  return String(value).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

/**
 * Remove tags HTML de uma string, retornando texto puro.
 * Útil quando o dado pode conter HTML legado mas só queremos o texto.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function stripTags(value){
  if(value == null) return '';
  return String(value).replace(/<[^>]*>/g, '');
}

/**
 * Normaliza uma string para comparação/busca:
 * - trim
 * - lowercase
 * - remove acentos (NFD + remoção de combining marks)
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeForSearch(value){
  if(value == null) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
