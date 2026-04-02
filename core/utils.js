export function uid(){
  return Date.now() + '-' + Math.random().toString(36).slice(2,8);
}

export function norm(s){
  return String(s || '').toLowerCase().trim();
}

export function fmt(v){
  return 'R$ ' + Number(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
}

export function fmtN(v, d = 2){
  return Number(v || 0).toFixed(d);
}

export function fmtQ(v){
  return Number(v || 0) % 1 === 0 ? String(Number(v || 0)) : Number(v || 0).toFixed(2);
}

export function pct(v){
  return Number(v || 0).toFixed(1) + '%';
}

export function mk2mg(mk){
  return mk <= 0 ? 0 : mk / (1 + mk / 100) * 100;
}

export function mg2mk(mg){
  return mg <= 0 || mg >= 100 ? 0 : mg / (1 - mg / 100) - 100;
}

export function prV(c, mk){
  return (Number(c || 0)) * (1 + (Number(mk || 0) / 100));
}

export function toast(m){
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = m;
  el.classList.add('on');
  clearTimeout(window._tt);
  window._tt = setTimeout(() => el.classList.remove('on'), 2600);
}

export function abrirModal(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.add('on');
  document.body.style.overflow = 'hidden';
}

export function fecharModal(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.remove('on');
  document.body.style.overflow = '';
}

export function chunkArray(arr, size = 200){
  const out = [];
  for(let i = 0; i < arr.length; i += size){
    out.push(arr.slice(i, i + size));
  }
  return out;
}