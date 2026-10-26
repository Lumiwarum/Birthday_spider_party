'use strict';
/* ---------- small renderers ---------- */
function avatar(p, size){
  const src = imgSrc(p.avatar);
  return `<span class="av" style="--c:${esc(p.color)};${size?'--s:'+size+'px':''}">${src ? `<img src="${src}" alt="">` : esc(initials(p.name))}</span>`;
}
const chip = (t, c='') => `<span class="chip ${c}">${t}</span>`;
const condChip = c => `<span class="chip cond-${c}">${CONDITIONS[c]}</span>`;
const recogChip = () => `<span class="recog">УЗНАВАЕМА</span>`;
const kicker = (t, c='') => `<div class="kicker ${c}"><span>${t}</span></div>`;
const lockedScreen = () => `<div class="lockbox panel"><div class="big">${ICONS.lock.replace('<svg','<svg width="70" height="70"')}</div><h2 style="margin:10px 0">Только для ведущего</h2><p class="muted">Этот экран скрыт в режиме демонстрации. Переключитесь в режим ведущего, когда гости не смотрят на экран.</p></div>`;

function eventRow(e){
  const t = EVENT_TYPES[e.type] || {label:e.type, chip:''};
  const p = e.playerId && P(e.playerId);
  const showSecret = !isDemo() && e.secret;
  return `<div class="ev ${e.pub?'':'priv'}"><span class="tm">${fmtTime(e.t)}</span><span class="ty">${chip(t.label, t.chip)}</span>
    <span class="tx">${esc(e.text)}${showSecret?`<span class="sec">${esc(e.secret)}</span>`:''}</span><span>${p?avatar(p,26):''}</span></div>`;
}
const visibleLog = () => state.log.filter(e => !isDemo() || e.pub);
