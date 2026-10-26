'use strict';
/* ---------- Галерея фигурок ---------- */
function viewGallery(){
  const host = !isDemo();
  return `<div class="screen-h"><div>${kicker('Коллекция','pink')}<h1>Фигурки</h1><div class="sub">11 минифигурок LEGO, которые разыгрываются на вечеринке.${host ? ' Ведущему видны стартовые порталы, текущее расположение и квесты.' : ''}</div></div></div>
  <div class="gcards">${state.figures.map(f => galleryCard(f, host)).join('')}</div>`;
}
function galleryCard(f, host){
  const full = figFullSrc(f), u = UNIQUE_BY_FIG[f.id];
  const starter = state.players.find(p => p.charId === f.id);
  const start = state.home ? state.home[f.id] : portalOfFig(f.id);
  const now = portalOfFig(f.id);
  return `<article class="gcard" style="--c:${esc(f.color)}">
    <div class="gimg ${full ? 'full' : ''}"><img src="${full || figSrc(f)}" alt=""></div>
    <div class="gbody"><b class="gname">${esc(f.name)}</b><span class="small muted">${esc(f.nameEn)}</span>
      ${host ? `<div class="ginfo">
        <div><span class="dim small">Старт</span> <b>№${start}</b>${starter ? ` · ${esc(starter.name)}` : ''}</div>
        <div><span class="dim small">Сейчас</span> <b>№${now}</b> · ${esc(batchOf(now).name)}</div>
        <div class="small"><span class="dim">Квест:</span> ${esc(f.quest)}</div>
        <div class="small"><span class="dim">Способность:</span> <b style="color:var(--c)">${esc(u.name)}</b></div>
      </div>` : ''}
    </div>
  </article>`;
}
