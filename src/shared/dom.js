// @ts-check

import { markInvalidation, markRender } from './render-metrics.js';

/** @typedef {import('../types/domain').ScreenDom} ScreenDom */

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeContent(value) {
  return value == null ? '' : String(value);
}

/**
 * @param {string} page
 * @param {string[]} [trackedIds=[]]
 * @returns {ScreenDom}
 */
export function createScreenDom(page, trackedIds = []) {
  /** @type {Map<string, HTMLElement | null>} */
  const cache = new Map();
  trackedIds.forEach((id) => cache.set(id, null));

  /**
   * @param {string} id
   * @returns {HTMLElement | null}
   */
  function get(id) {
    if (!cache.has(id)) {
      cache.set(id, null);
    }

    const cached = cache.get(id);
    if (cached?.isConnected) return cached;

    const resolved = document.getElementById(id) || null;
    cache.set(id, resolved);
    return resolved;
  }

  /**
   * @param {...string} ids
   * @returns {Record<string, HTMLElement | null>}
   */
  function pick(...ids) {
    return ids.reduce((acc, id) => {
      acc[id] = get(id);
      return acc;
    }, /** @type {Record<string, HTMLElement | null>} */ ({}));
  }

  /**
   * @param {string} area
   * @param {string} reason
   * @param {string} id
   * @param {(el: HTMLElement) => unknown} read
   * @param {(el: HTMLElement, value: string) => void} write
   * @param {unknown} nextValue
   * @returns {boolean}
   */
  function update(area, reason, id, read, write, nextValue) {
    markInvalidation(page, area, reason);

    const el = get(id);
    if (!el) return false;

    const next = normalizeContent(nextValue);
    if (normalizeContent(read(el)) === next) return false;

    write(el, next);
    markRender(page, area);
    return true;
  }

  return {
    get,
    pick,
    /**
     * @param {string} area
     * @param {string} id
     * @param {string} html
     * @param {string} [reason='render']
     * @returns {boolean}
     */
    html(area, id, html, reason = 'render') {
      return update(
        area,
        reason,
        id,
        (el) => el.innerHTML,
        (el, value) => {
          el.innerHTML = value;
        },
        html
      );
    },
    /**
     * @param {string} area
     * @param {string} id
     * @param {string} text
     * @param {string} [reason='render']
     * @returns {boolean}
     */
    text(area, id, text, reason = 'render') {
      return update(
        area,
        reason,
        id,
        (el) => el.textContent,
        (el, value) => {
          el.textContent = value;
        },
        text
      );
    },
    /**
     * @param {string} id
     * @param {string | number} value
     * @returns {boolean}
     */
    value(id, value) {
      const el = /** @type {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null} */ (
        get(id)
      );
      if (!el) return false;
      const next = normalizeContent(value);
      if (normalizeContent(el.value) === next) return false;
      el.value = next;
      return true;
    },
    /**
     * @param {string} id
     * @param {boolean} checked
     * @returns {boolean}
     */
    checked(id, checked) {
      const el = /** @type {HTMLInputElement | null} */ (get(id));
      if (!el) return false;
      const next = !!checked;
      if (!!el.checked === next) return false;
      el.checked = next;
      return true;
    },
    /**
     * @param {string} area
     * @param {string} id
     * @param {string} value
     * @param {string} [reason='render']
     * @returns {boolean}
     */
    display(area, id, value, reason = 'render') {
      return update(
        area,
        reason,
        id,
        (el) => el.style.display,
        (el, next) => {
          el.style.display = next;
        },
        value
      );
    },
    /**
     * @param {string} area
     * @param {string} id
     * @param {string} optionsHtml
     * @param {string} [currentValue='']
     * @param {string} [reason='render']
     * @returns {boolean}
     */
    select(area, id, optionsHtml, currentValue = '', reason = 'render') {
      markInvalidation(page, area, reason);
      const el = /** @type {HTMLSelectElement | null} */ (get(id));
      if (!el) return false;

      let changed = false;
      const nextOptions = normalizeContent(optionsHtml);
      if (normalizeContent(el.innerHTML) !== nextOptions) {
        el.innerHTML = nextOptions;
        changed = true;
      }

      const nextValue = normalizeContent(currentValue);
      if (nextValue && normalizeContent(el.value) !== nextValue) {
        el.value = nextValue;
        changed = true;
      }

      if (changed) markRender(page, area);
      return changed;
    },
    /**
     * @param {...string} ids
     */
    invalidate(...ids) {
      ids.forEach((id) => cache.delete(id));
    }
  };
}
