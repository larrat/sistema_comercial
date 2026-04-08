// @ts-check

/**
 * @typedef {{
 *   page: string;
 *   renders: Record<string, number>;
 *   invalidations: Record<string, number>;
 *   lastRenderAt: number;
 *   lastInvalidationAt: number;
 * }} RenderMetricsEntry
 */

/** @type {Map<string, RenderMetricsEntry>} */
const pageMetrics = new Map();

/** @param {string} page */
function ensurePage(page){
  if(!pageMetrics.has(page)){
    pageMetrics.set(page, {
      page,
      renders: {},
      invalidations: {},
      lastRenderAt: 0,
      lastInvalidationAt: 0
    });
  }
  return /** @type {RenderMetricsEntry} */ (pageMetrics.get(page));
}

/**
 * @param {Record<string, number>} target
 * @param {string} key
 */
function bumpCounter(target, key){
  target[key] = (target[key] || 0) + 1;
}

/**
 * @param {string} page
 * @param {string} [area='page']
 * @param {string} [reason='unknown']
 */
export function markInvalidation(page, area = 'page', reason = 'unknown'){
  const entry = ensurePage(page);
  bumpCounter(entry.invalidations, `${area}:${reason}`);
  entry.lastInvalidationAt = Date.now();
}

/**
 * @param {string} page
 * @param {string} [area='page']
 */
export function markRender(page, area = 'page'){
  const entry = ensurePage(page);
  bumpCounter(entry.renders, area);
  entry.lastRenderAt = Date.now();
}

/**
 * @param {string} [page]
 * @returns {RenderMetricsEntry | RenderMetricsEntry[] | null}
 */
export function getRenderMetrics(page){
  if(page) return pageMetrics.get(page) || null;
  return Array.from(pageMetrics.values()).map(entry => ({
    ...entry,
    renders: { ...entry.renders },
    invalidations: { ...entry.invalidations }
  }));
}

/** @param {string} [page] */
export function resetRenderMetrics(page){
  if(page){
    pageMetrics.delete(page);
    return;
  }
  pageMetrics.clear();
}
