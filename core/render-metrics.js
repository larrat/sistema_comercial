const pageMetrics = new Map();

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
  return pageMetrics.get(page);
}

function bumpCounter(target, key){
  target[key] = (target[key] || 0) + 1;
}

export function markInvalidation(page, area = 'page', reason = 'unknown'){
  const entry = ensurePage(page);
  bumpCounter(entry.invalidations, `${area}:${reason}`);
  entry.lastInvalidationAt = Date.now();
}

export function markRender(page, area = 'page'){
  const entry = ensurePage(page);
  bumpCounter(entry.renders, area);
  entry.lastRenderAt = Date.now();
}

export function getRenderMetrics(page){
  if(page) return pageMetrics.get(page) || null;
  return Array.from(pageMetrics.values()).map(entry => ({
    ...entry,
    renders: { ...entry.renders },
    invalidations: { ...entry.invalidations }
  }));
}

export function resetRenderMetrics(page){
  if(page){
    pageMetrics.delete(page);
    return;
  }
  pageMetrics.clear();
}
