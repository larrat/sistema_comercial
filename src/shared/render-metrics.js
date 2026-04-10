// @ts-check

/**
 * @typedef {{
 *   page: string;
 *   renders: Record<string, number>;
 *   durations: Record<string, { count: number, total: number, max: number, last: number }>;
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
      durations: {},
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

function nowMs(){
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
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
 * @param {string} page
 * @param {string} [area='page']
 * @param {number} durationMs
 */
export function markRenderDuration(page, area = 'page', durationMs = 0){
  const entry = ensurePage(page);
  const current = entry.durations[area] || { count: 0, total: 0, max: 0, last: 0 };
  const safeDuration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  current.count += 1;
  current.total += safeDuration;
  current.max = Math.max(current.max, safeDuration);
  current.last = safeDuration;
  entry.durations[area] = current;
}

/**
 * @template T
 * @param {string} page
 * @param {() => T} fn
 * @param {string} [area='page']
 * @returns {T}
 */
export function measureRender(page, fn, area = 'page'){
  const startedAt = nowMs();
  const result = fn();
  markRender(page, area);
  markRenderDuration(page, area, nowMs() - startedAt);
  return result;
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
    durations: Object.fromEntries(Object.entries(entry.durations).map(([key, value]) => [key, { ...value }])),
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
