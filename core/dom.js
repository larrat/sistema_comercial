import { markInvalidation, markRender } from './render-metrics.js';

function normalizeContent(value){
  return value == null ? '' : String(value);
}

export function createScreenDom(page, trackedIds = []){
  const cache = new Map();
  trackedIds.forEach(id => cache.set(id, null));

  function get(id){
    if(!cache.has(id)){
      cache.set(id, null);
    }

    const cached = cache.get(id);
    if(cached?.isConnected) return cached;

    const resolved = document.getElementById(id) || null;
    cache.set(id, resolved);
    return resolved;
  }

  function pick(...ids){
    return ids.reduce((acc, id) => {
      acc[id] = get(id);
      return acc;
    }, {});
  }

  function update(area, reason, id, read, write, nextValue){
    markInvalidation(page, area, reason);

    const el = get(id);
    if(!el) return false;

    const next = normalizeContent(nextValue);
    if(normalizeContent(read(el)) === next) return false;

    write(el, next);
    markRender(page, area);
    return true;
  }

  return {
    get,
    pick,
    html(area, id, html, reason = 'render'){
      return update(area, reason, id, el => el.innerHTML, (el, value) => {
        el.innerHTML = value;
      }, html);
    },
    text(area, id, text, reason = 'render'){
      return update(area, reason, id, el => el.textContent, (el, value) => {
        el.textContent = value;
      }, text);
    },
    value(id, value){
      const el = get(id);
      if(!el) return false;
      const next = normalizeContent(value);
      if(normalizeContent(el.value) === next) return false;
      el.value = next;
      return true;
    },
    checked(id, checked){
      const el = get(id);
      if(!el) return false;
      const next = !!checked;
      if(!!el.checked === next) return false;
      el.checked = next;
      return true;
    },
    display(area, id, value, reason = 'render'){
      return update(area, reason, id, el => el.style.display, (el, next) => {
        el.style.display = next;
      }, value);
    },
    select(area, id, optionsHtml, currentValue = '', reason = 'render'){
      markInvalidation(page, area, reason);
      const el = get(id);
      if(!el) return false;

      let changed = false;
      const nextOptions = normalizeContent(optionsHtml);
      if(normalizeContent(el.innerHTML) !== nextOptions){
        el.innerHTML = nextOptions;
        changed = true;
      }

      const nextValue = normalizeContent(currentValue);
      if(nextValue && normalizeContent(el.value) !== nextValue){
        el.value = nextValue;
        changed = true;
      }

      if(changed) markRender(page, area);
      return changed;
    },
    invalidate(...ids){
      ids.forEach(id => cache.delete(id));
    }
  };
}
