'use strict';
/* ---------- utils ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = o => JSON.parse(JSON.stringify(o));
function shuffle(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
const pickN = (arr, n) => shuffle(arr).slice(0, n);
// случайная перестановка индексов 0..k-1 (все k! вариантов равновероятны)
const randomPerm = k => shuffle([...Array(k).keys()]);
const fmtTime = t => new Date(t).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
const sign = n => (n>0?'+':'') + n;
const initials = s => String(s||'?').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
// EP хранится в половинках
const fmtEP = ep2 => (ep2 / 2).toLocaleString('ru-RU');
const epText = ep2 => fmtEP(ep2) + ' EP';
const signEP = ep2 => (ep2 > 0 ? '+' : ep2 < 0 ? '−' : '') + fmtEP(Math.abs(ep2));
const plural = (n, one, few, many) => { const m10 = n % 10, m100 = n % 100; return m10===1 && m100!==11 ? one : m10>=2 && m10<=4 && (m100<10 || m100>=20) ? few : many; };
function setPath(obj, path, v){
  const keys = path.split('.'); let o = obj;
  for(let i=0;i<keys.length-1;i++){ const k = keys[i]; if(o[k] == null) o[k] = /^\d+$/.test(keys[i+1]) ? [] : {}; o = o[k]; }
  o[keys[keys.length-1]] = v;
}
const getPath = (obj, path) => path.split('.').reduce((o, k) => o == null ? undefined : o[k], obj);

/* Ошибка игровых правил: act() откатывает изменения и показывает сообщение */
class GameError extends Error {}
const fail = msg => { throw new GameError(msg); };
